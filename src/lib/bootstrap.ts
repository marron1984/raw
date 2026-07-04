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
  // ビルド（事前生成）中はDBに触らない。実リクエスト時のみ実行する。
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return Promise.resolve();
  }
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

// 既存DBへのカラム追加（後方互換のための軽量マイグレーション）。
// bootstrap-sql は新規DB作成時のみ実行されるため、既存DBには
// ADD COLUMN IF NOT EXISTS で冪等にカラムを追加する。
const COLUMN_MIGRATIONS = [
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT',
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "driveSavedAt" TIMESTAMP(3)',
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "explanationTitle" TEXT',
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "explanationBody" TEXT',
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "staffName" TEXT',
  'ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "staffEmail" TEXT',
  'ALTER TABLE "Signer" ADD COLUMN IF NOT EXISTS "clientId" TEXT',
  'CREATE INDEX IF NOT EXISTS "Signer_clientId_idx" ON "Signer"("clientId")',
  `CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "fieldsJson" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
  )`,
];

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
  // 既存DBへのカラム追加（冪等）
  for (const sql of COLUMN_MIGRATIONS) {
    await prisma.$executeRawUnsafe(sql);
  }
  // 初期管理者・標準テンプレートを同期（冪等）
  await syncCoreData(prisma);
}
