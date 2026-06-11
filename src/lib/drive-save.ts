import { prisma } from "./db";
import { renderContractPdf } from "./contract-pdf";
import { uploadPdfToDrive, isDriveConfigured } from "./gdrive";
import { recordAudit } from "./audit";

export { isDriveConfigured };

// 締結済み契約のPDFをGoogleドライブへ保存する（ベストエフォート）。
// 未設定時は何もせず skipped を返す。失敗しても例外は投げない。
export async function saveContractToDrive(
  contractId: string,
  actor: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isDriveConfigured()) return { ok: false, skipped: true };

  try {
    const pdf = await renderContractPdf(contractId);
    if (!pdf) return { ok: false, error: "契約が見つかりません" };

    const res = await uploadPdfToDrive({
      filename: pdf.filename,
      bytes: pdf.bytes,
    });

    if (res.ok) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { driveFileId: res.fileId, driveSavedAt: new Date() },
      });
      await recordAudit({
        contractId,
        event: "DRIVE_SAVED",
        actor,
        detail: `Googleドライブに保存: ${pdf.filename}`,
      });
      return { ok: true };
    }

    await recordAudit({
      contractId,
      event: "DRIVE_FAILED",
      actor,
      detail: `Googleドライブ保存に失敗（${res.error ?? "不明なエラー"}）`,
    });
    return { ok: false, error: res.error };
  } catch (e) {
    await recordAudit({
      contractId,
      event: "DRIVE_FAILED",
      actor,
      detail: `Googleドライブ保存に失敗（${String(e)}）`,
    }).catch(() => {});
    return { ok: false, error: String(e) };
  }
}
