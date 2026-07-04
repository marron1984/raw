"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { renderTemplate, extractPlaceholders } from "@/lib/template";
import { recordAudit, getClientIp } from "@/lib/audit";
import { generateSignToken } from "@/lib/token";
import { sendSignRequestEmail } from "@/lib/email";
import { signUrlForToken } from "@/lib/url";
import { saveContractToDrive } from "@/lib/drive-save";

const signerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
});

const createSchema = z.object({
  templateId: z.string().min(1, "テンプレートを選択してください"),
  explanationTemplateId: z.string().optional(),
  staffId: z.string().optional(),
  title: z.string().trim().min(1, "契約タイトルを入力してください"),
  fields: z.record(z.string()),
  signers: z.array(signerSchema).min(1, "署名者を1名以上入力してください"),
});

// 新規契約の作成（テンプレート本文を差し込んでスナップショット化）
export async function createContractAction(
  payload: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  requireAuth();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { templateId, explanationTemplateId, staffId, title, fields, signers } =
    parsed.data;

  // 担当者（担当者マスタから選択）
  const staff = staffId
    ? await prisma.staff.findUnique({ where: { id: staffId } })
    : null;

  const template = await prisma.contractTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return { ok: false, error: "テンプレートが見つかりません。" };

  // 本文へ値を差し込んでスナップショット化
  const body = renderTemplate(template.body, fields);

  // 重要事項説明書（任意）。契約と同じ差し込み値を共用してスナップショット化
  let explanationTitle: string | null = null;
  let explanationBody: string | null = null;
  if (explanationTemplateId) {
    const exp = await prisma.contractTemplate.findUnique({
      where: { id: explanationTemplateId },
    });
    if (exp) {
      explanationTitle = exp.title;
      explanationBody = renderTemplate(exp.body, fields);
    }
  }

  const contract = await prisma.contract.create({
    data: {
      title,
      category: template.category,
      body,
      explanationTitle,
      explanationBody,
      fields: JSON.stringify(fields),
      templateId: template.id,
      staffName: staff?.name ?? null,
      staffEmail: staff?.email ?? null,
      status: "DRAFT",
      signers: {
        create: signers.map((s, i) => ({
          name: s.name,
          email: s.email,
          order: i + 1,
          token: generateSignToken(),
        })),
      },
    },
  });

  await recordAudit({
    contractId: contract.id,
    event: "CREATED",
    actor: staff?.name ?? "職員",
    detail: `テンプレート「${template.title}」から作成`,
    ipAddress: getClientIp(),
  });

  return { ok: true, id: contract.id };
}

// 契約を「送信」状態にし、署名者へ署名依頼メールを送る
export async function sendContractAction(id: string): Promise<void> {
  requireAuth();
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { signers: true },
  });
  if (!contract) return;
  if (contract.status !== "DRAFT") return;

  await prisma.contract.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });
  await recordAudit({
    contractId: id,
    event: "SENT",
    actor: contract.staffName ?? "職員",
    detail: "署名依頼を送信",
    ipAddress: getClientIp(),
  });

  // 各署名者へ署名依頼メールを送信（メール未設定時はURLコピー運用）
  for (const signer of contract.signers) {
    const res = await sendSignRequestEmail({
      to: signer.email,
      signerName: signer.name,
      contractTitle: contract.title,
      signUrl: signUrlForToken(signer.token),
    });
    if (res.skipped) continue;
    await recordAudit({
      contractId: id,
      event: res.ok ? "EMAIL_SENT" : "EMAIL_FAILED",
      actor: "system",
      detail: res.ok
        ? `署名依頼メールを送信: ${signer.email}`
        : `メール送信失敗: ${signer.email}（${res.error ?? "不明なエラー"}）`,
    });
  }

  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
}

// 1名の署名者へ署名依頼メールを再送する
export async function resendSignEmailAction(signerId: string): Promise<void> {
  requireAuth();
  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    include: { contract: true },
  });
  if (!signer) return;
  if (!["SENT", "VIEWED"].includes(signer.contract.status)) return;

  const res = await sendSignRequestEmail({
    to: signer.email,
    signerName: signer.name,
    contractTitle: signer.contract.title,
    signUrl: signUrlForToken(signer.token),
  });
  await recordAudit({
    contractId: signer.contractId,
    event: res.ok ? "EMAIL_SENT" : "EMAIL_FAILED",
    actor: signer.contract.staffName ?? "職員",
    detail: res.skipped
      ? "メール未設定のため送信せず（URLを案内してください）"
      : res.ok
        ? `署名依頼メールを再送: ${signer.email}`
        : `メール再送失敗: ${signer.email}（${res.error ?? "不明なエラー"}）`,
    ipAddress: getClientIp(),
  });
  revalidatePath(`/contracts/${signer.contractId}`);
}

// 締結済み契約のPDFをGoogleドライブへ手動保存（再保存）する
export async function saveToDriveAction(id: string): Promise<void> {
  requireAuth();
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.status !== "SIGNED") return;
  await saveContractToDrive(id, contract.staffName ?? "職員");
  revalidatePath(`/contracts/${id}`);
}

// 契約の取消
export async function cancelContractAction(id: string): Promise<void> {
  requireAuth();
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return;
  if (contract.status === "SIGNED") return; // 締結済みは取消不可

  await prisma.contract.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await recordAudit({
    contractId: id,
    event: "CANCELLED",
    actor: contract.staffName ?? "職員",
    detail: "契約を取消",
    ipAddress: getClientIp(),
  });
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
}

// 契約の削除（下書き・取消のみ）
export async function deleteContractAction(id: string): Promise<void> {
  requireAuth();
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return;
  if (!["DRAFT", "CANCELLED"].includes(contract.status)) return;
  await prisma.contract.delete({ where: { id } });
  revalidatePath("/contracts");
  redirect("/contracts");
}

// テンプレートのプレースホルダ取得（新規作成フォーム用）
export async function getTemplatePlaceholdersAction(
  templateId: string
): Promise<{ keys: string[]; body: string } | null> {
  requireAuth();
  const template = await prisma.contractTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return null;
  return { keys: extractPlaceholders(template.body), body: template.body };
}
