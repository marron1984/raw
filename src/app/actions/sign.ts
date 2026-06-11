"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit, getClientIp } from "@/lib/audit";

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
