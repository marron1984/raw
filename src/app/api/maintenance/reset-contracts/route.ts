import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 契約データの全削除（本番公開前の一度きりのリセット用）。
// 環境変数 MAINTENANCE_KEY が設定されている場合のみ有効で、
// ?key=<MAINTENANCE_KEY> が一致したときだけ実行する。
// 使い終わったら MAINTENANCE_KEY を削除しておくこと。
// テンプレート・相手先・担当者は削除しない。
export async function GET(req: NextRequest) {
  const configured = process.env.MAINTENANCE_KEY;
  if (!configured) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const a = crypto.createHash("sha256").update(key).digest();
  const b = crypto.createHash("sha256").update(configured).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Signer / AuditLog は onDelete: Cascade で契約と一緒に削除される
  const result = await prisma.contract.deleteMany({});
  return NextResponse.json({
    ok: true,
    deletedContracts: result.count,
    message: `契約 ${result.count} 件を削除しました（テンプレート・相手先・担当者は保持）。作業後は MAINTENANCE_KEY を削除してください。`,
  });
}
