import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// DB接続の診断用エンドポイント。実際のエラーメッセージを返して原因を切り分ける。
// 秘密情報（接続文字列の中身）は返さず、設定の有無・形式のみを返す。
export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const env = {
    DATABASE_URL_set: url.length > 0,
    uses_pooler: url.includes("pooler.supabase.com"),
    port_6543: url.includes(":6543"),
    port_5432: url.includes(":5432"),
    has_sslmode: url.includes("sslmode="),
    has_pgbouncer_flag: url.includes("pgbouncer=true"),
    host_hint: (url.match(/@([^/:]+)/)?.[1] ?? "").slice(0, 40),
  };

  const steps: Record<string, unknown> = {};

  // 1) 素の疎通
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    steps.select1 = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    steps.select1 = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: (e as { code?: string })?.code,
    };
    return NextResponse.json({ ok: false, env, steps }, { status: 200 });
  }

  // 2) 主要テーブルの存在確認
  try {
    const rows = await prisma.$queryRaw<{ r: string | null }[]>`
      SELECT to_regclass('public."Contract"')::text AS r
    `;
    steps.contractTable = { exists: rows[0]?.r != null };
  } catch (e) {
    steps.contractTable = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 3) clientId カラム（今回追加）の存在確認
  try {
    const rows = await prisma.$queryRaw<{ c: string | null }[]>`
      SELECT column_name AS c
      FROM information_schema.columns
      WHERE table_name = 'Signer' AND column_name = 'clientId'
    `;
    steps.signerClientIdColumn = { exists: rows.length > 0 };
  } catch (e) {
    steps.signerClientIdColumn = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 4) 実クエリ（ダッシュボードと同種）
  try {
    const count = await prisma.contract.count();
    steps.contractCount = { ok: true, count };
  } catch (e) {
    steps.contractCount = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json({ ok: true, env, steps }, { status: 200 });
}
