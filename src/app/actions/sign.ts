"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit, getClientIp } from "@/lib/audit";
import { saveContractToDrive } from "@/lib/drive-save";
import { renderContractPdf } from "@/lib/contract-pdf";
import { sendCompletedCopyEmail } from "@/lib/email";

// 署名ページが開かれたことを記録（閲覧ログ）
export async function markViewedAction(token: string): Promise<void> {
  const signer = await prisma.signer.findUnique({
    where: { token },
    include: { contract: true },
  });
  if (!signer) return;
  if (signer.status === "PENDING") {
    await prisma.signer.update({
      where: { id: signer.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    // 契約全体のステータスも閲覧済みへ（送信済みの場合）
    if (signer.contract.status === "SENT") {
      await prisma.contract.update({
        where: { id: signer.contractId },
        data: { status: "VIEWED" },
      });
    }
    await recordAudit({
      contractId: signer.contractId,
      event: "VIEWED",
      actor: signer.name,
      detail: "署名者が契約内容を閲覧",
      ipAddress: getClientIp(),
    });
  }
}

// 同意・署名の確定（メール認証＋手書き署名方式）
export async function signAction(
  token: string,
  _prev: { error?: string; done?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; done?: boolean }> {
  const agreed = formData.get("agree") === "on";
  const signature = String(formData.get("signature") ?? "");

  if (!agreed) {
    return { error: "「契約内容に同意します」にチェックしてください。" };
  }
  // 手書き署名（PNGのdata URL）が描かれているか検証
  if (!signature.startsWith("data:image/png;base64,") || signature.length < 200) {
    return { error: "枠内にご署名ください。" };
  }
  // 過大なデータを弾く（おおよそ 2MB 相当まで）
  if (signature.length > 2_800_000) {
    return { error: "署名データが大きすぎます。書き直してお試しください。" };
  }

  const signer = await prisma.signer.findUnique({
    where: { token },
    include: { contract: { include: { signers: true } } },
  });
  if (!signer) return { error: "署名リンクが無効です。" };
  if (signer.status === "SIGNED") return { done: true };
  if (["CANCELLED", "DECLINED"].includes(signer.contract.status)) {
    return { error: "この契約は無効化されています。" };
  }

  const ip = getClientIp();
  const ua = headers().get("user-agent") ?? "unknown";

  await prisma.signer.update({
    where: { id: signer.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      signatureImage: signature,
      typedName: signer.name,
      ipAddress: ip,
      userAgent: ua,
    },
  });
  await recordAudit({
    contractId: signer.contractId,
    event: "SIGNED",
    actor: signer.name,
    detail: "手書き署名により同意・署名",
    ipAddress: ip,
  });

  // 全署名者が署名完了したら契約を締結済みにする
  const others = signer.contract.signers.filter((s) => s.id !== signer.id);
  const allSigned = others.every((s) => s.status === "SIGNED");
  if (allSigned) {
    await prisma.contract.update({
      where: { id: signer.contractId },
      data: { status: "SIGNED", completedAt: new Date() },
    });
    await recordAudit({
      contractId: signer.contractId,
      event: "COMPLETED",
      actor: "system",
      detail: "全署名者の署名が完了し締結",
    });

    // 締結PDFを1回だけ生成し、ドライブ保存と控えメール送付で使い回す
    const pdf = await renderContractPdf(signer.contractId);

    // Googleドライブへ自動保存（未設定時は何もしない）
    await saveContractToDrive(
      signer.contractId,
      "system",
      pdf ?? undefined
    );

    // 締結済みPDFを控えとして署名者・担当者へ自動送付（未設定時はスキップ）
    if (pdf) {
      const base64 = Buffer.from(pdf.bytes).toString("base64");
      const recipients: { to: string; name: string }[] = signer.contract.signers
        .filter((s) => s.email)
        .map((s) => ({ to: s.email, name: s.name }));
      const staffEmail = signer.contract.staffEmail;
      if (staffEmail && !recipients.some((r) => r.to === staffEmail)) {
        recipients.push({
          to: staffEmail,
          name: signer.contract.staffName ?? "担当者",
        });
      }
      for (const r of recipients) {
        const res = await sendCompletedCopyEmail({
          to: r.to,
          recipientName: r.name,
          contractTitle: signer.contract.title,
          attachment: { filename: pdf.filename, base64 },
        });
        if (res.skipped) break; // メール未設定なら以降も同様なので打ち切り
        await recordAudit({
          contractId: signer.contractId,
          event: res.ok ? "COPY_SENT" : "COPY_FAILED",
          actor: "system",
          detail: res.ok
            ? `締結済みPDFの控えを送付: ${r.to}`
            : `控え送付失敗: ${r.to}（${res.error ?? "不明なエラー"}）`,
        });
      }
    }
  }

  revalidatePath(`/contracts/${signer.contractId}`);
  return { done: true };
}

// 署名の拒否
export async function declineAction(token: string): Promise<{ done: boolean }> {
  const signer = await prisma.signer.findUnique({
    where: { token },
    include: { contract: true },
  });
  if (!signer) return { done: false };
  if (signer.status === "SIGNED") return { done: false };

  await prisma.signer.update({
    where: { id: signer.id },
    data: { status: "DECLINED", declinedAt: new Date() },
  });
  await prisma.contract.update({
    where: { id: signer.contractId },
    data: { status: "DECLINED" },
  });
  await recordAudit({
    contractId: signer.contractId,
    event: "DECLINED",
    actor: signer.name,
    detail: "署名者が署名を拒否",
    ipAddress: getClientIp(),
  });
  return { done: true };
}
