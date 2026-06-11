import { prisma } from "./db";
import { BOOTSTRAP_DDL } from "./bootstrap-sql";
import { syncCoreData } from "./seed-core";

// アプリ初回アクセス時にDBを自動セットアップする。
// ビルド時のDB接続を不要にし、デプロイ失敗の原因を減らすための仕組み。
// - テーブルが無ければ DDL を実行して作成
// - 初期管理者・標準テンプレートを同期
// プロセス（サーバーレス関数インスタンス）ごとに1回だけ実行される。

let bootstrapPromise: Promise<void> | null = null;

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = run().catch((e) => {
      // 失敗した場合は次のリクエストで再試行できるようにする
      bootstrapPromise = null;
      throw e;
    });
  }
  return bootstrapPromise;
}

async function tablesExist(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ r: string | null }[]>`
    SELECT to_regclass('public."User"')::text AS r
  `;
  return rows.length > 0 && rows[0].r != null;
}

async function run(): Promise<void> {
  if (!(await tablesExist())) {
    // 複数インスタンスが同時に初期化しないようアドバイザリロックで直列化。
    // （Supabase Session pooler はセッション中は同一バックエンドに固定されるため
    //   トランザクションスコープのロックが有効に機能する）
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(729384651)");
        const rows = await tx.$queryRaw<{ r: string | null }[]>`
          SELECT to_regclass('public."User"')::text AS r
        `;
        if (rows.length > 0 && rows[0].r != null) return; // 他で作成済み
        for (const stmt of BOOTSTRAP_DDL.split(";")) {
          const sql = stmt.trim();
          if (sql) await tx.$executeRawUnsafe(sql);
        }
      },
      { timeout: 60_000 }
    );
  }
  // 初期管理者・標準テンプレートを同期（冪等）
  await syncCoreData(prisma);
}
