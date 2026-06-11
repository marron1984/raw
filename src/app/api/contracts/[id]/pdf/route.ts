import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { generateContractPdf } from "@/lib/pdf";
import { CATEGORY_LABELS } from "@/lib/template";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // PDFダウンロードは社内ユーザーのみ
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { signers: { orderBy: { order: "asc" } } },
  });
  if (!contract) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const pdf = await generateContractPdf({
    title: contract.title,
    categoryLabel: CATEGORY_LABELS[contract.category] ?? contract.category,
    body: contract.body,
    contractId: contract.id,
    createdAt: contract.createdAt,
    completedAt: contract.completedAt,
    signers: contract.signers.map((s) => ({
      name: s.name,
      email: s.email,
      status: s.status,
      signedAt: s.signedAt,
      typedName: s.typedName,
      ipAddress: s.ipAddress,
      signatureImage: s.signatureImage,
    })),
  });

  // 締結済みPDFの生成は証跡として記録
  if (contract.status === "SIGNED") {
    await recordAudit({
      contractId: contract.id,
      event: "PDF_GENERATED",
      actor: user.name,
      detail: "締結済みPDFをダウンロード",
    });
  }

  const filename = `contract-${contract.id}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
