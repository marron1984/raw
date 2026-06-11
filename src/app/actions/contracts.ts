"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { renderTemplate, extractPlaceholders } from "@/lib/template";
import { recordAudit, getClientIp } from "@/lib/audit";
import { generateSignToken } from "@/lib/token";

const signerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
});

const createSchema = z.object({
  templateId: z.string().min(1, "テンプレートを選択してください"),
  title: z.string().trim().min(1, "契約タイトルを入力してください"),
  fields: z.record(z.string()),
  signers: z.array(signerSchema).min(1, "署名者を1名以上入力してください"),
});

// 新規契約の作成（テンプレート本文を差し込んでスナップショット化）
export async function createContractAction(
  payload: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { templateId, title, fields, signers } = parsed.data;

  const template = await prisma.contractTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return { ok: false, error: "テンプレートが見つかりません。" };

  // 本文へ値を差し込んでスナップショット化
  const body = renderTemplate(template.body, fields);

  const contract = await prisma.contract.create({
    data: {
      title,
      category: template.category,
      body,
      fields: JSON.stringify(fields),
      templateId: template.id,
      createdById: user.id,
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
    actor: user.name,
    detail: `テンプレート「${template.title}」から作成`,
    ipAddress: getClientIp(),
  });

  return { ok: true, id: contract.id };
}

// 契約を「送信」状態にする（署名者に署名URLを案内する段階）
export async function sendContractAction(id: string): Promise<void> {
  const user = await requireUser();
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return;
  if (contract.status !== "DRAFT") return;

  await prisma.contract.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });
  await prisma.signer.updateMany({
    where: { contractId: id, status: "PENDING" },
    data: { status: "PENDING" },
  });
  await recordAudit({
    contractId: id,
    event: "SENT",
    actor: user.name,
    detail: "署名依頼を送信",
    ipAddress: getClientIp(),
  });
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
}

// 契約の取消
export async function cancelContractAction(id: string): Promise<void> {
  const user = await requireUser();
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
    actor: user.name,
    detail: "契約を取消",
    ipAddress: getClientIp(),
  });
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
}

// 契約の削除（下書き・取消のみ）
export async function deleteContractAction(id: string): Promise<void> {
  await requireUser();
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
  await requireUser();
  const template = await prisma.contractTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return null;
  return { keys: extractPlaceholders(template.body), body: template.body };
}
