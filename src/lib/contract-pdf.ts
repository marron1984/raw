import { prisma } from "./db";
import { generateContractPdf } from "./pdf";
import { CATEGORY_LABELS } from "./template";

// 契約IDから締結PDFのバイト列とファイル名を生成する（PDF配信・ドライブ保存で共用）
export async function renderContractPdf(
  contractId: string
): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { signers: { orderBy: { order: "asc" } } },
  });
  if (!contract) return null;

  const bytes = await generateContractPdf({
    title: contract.title,
    categoryLabel: CATEGORY_LABELS[contract.category] ?? contract.category,
    body: contract.body,
    explanationTitle: contract.explanationTitle,
    explanationBody: contract.explanationBody,
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

  // ファイル名: タイトル_署名者_日付.pdf（ファイル名に使えない文字は除去）
  const safeTitle = contract.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  const firstSigner =
    contract.signers[0]?.name.replace(/[\\/:*?"<>|]/g, "_") ?? "";
  const d = contract.completedAt ?? contract.createdAt;
  const ymd = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(d)
    .replace(/\//g, "");
  const filename =
    `${safeTitle}${firstSigner ? "_" + firstSigner : ""}_${ymd}.pdf`;

  return { bytes, filename };
}
