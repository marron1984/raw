import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Supabase（無料プラン）はアイドルが続くとプロジェクトを一時停止する。
// Vercel Cron から定期的にこのエンドポイントを叩き、DBへ軽い問い合わせを
// 行うことで「使用中」とみなさせ、自動停止を防ぐ。
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    );
  }
}
