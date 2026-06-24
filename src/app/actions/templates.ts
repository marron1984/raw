"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください"),
  category: z.enum([
    "RESIDENCE",
    "CARE",
    "CAREPLAN",
    "DISABILITY",
    "EXPLANATION",
    "CONSENT",
    "OTHER",
  ]),
  description: z.string().trim().optional(),
  body: z.string().trim().min(1, "契約本文を入力してください"),
  isActive: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    body: formData.get("body"),
    isActive: formData.get("isActive") === "on",
  });
}

export async function createTemplateAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  await prisma.contractTemplate.create({
    data: { ...parsed.data, createdById: user.id },
  });
  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplateAction(
  id: string,
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  await prisma.contractTemplate.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  redirect("/templates");
}

export async function deleteTemplateAction(id: string): Promise<void> {
  await requireUser();
  // 契約から参照されている場合は無効化のみ（履歴保持のため物理削除しない）
  const used = await prisma.contract.count({ where: { templateId: id } });
  if (used > 0) {
    await prisma.contractTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await prisma.contractTemplate.delete({ where: { id } });
  }
  revalidatePath("/templates");
  redirect("/templates");
}
