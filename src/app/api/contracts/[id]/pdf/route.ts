import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { renderContractPdf } from "@/lib/contract-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // PDFダウンロードは共通パスワードでログイン済みの社内利用者のみ
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!contract) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const result = await renderContractPdf(contract.id);
  if (!result) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  // 締結済みPDFの生成は証跡として記録
  if (contract.status === "SIGNED") {
    await recordAudit({
      contractId: contract.id,
      event: "PDF_GENERATED",
      actor: "職員",
      detail: "締結済みPDFをダウンロード",
    });
  }

  return new NextResponse(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contract-${contract.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
