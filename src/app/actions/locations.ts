"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { FIELD_LABELS } from "@/lib/field-labels";

// フォームから差し込み初期値（f_ プレフィックス付き入力）を収集
function collectFields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    const v = String(formData.get(`f_${key}`) ?? "").trim();
    if (v) out[key] = v;
  }
  return out;
}

export async function createLocationAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "拠点名を入力してください" };
  const note = String(formData.get("note") ?? "").trim();
  await prisma.location.create({
    data: {
      name,
      note: note || null,
      fieldsJson: JSON.stringify(collectFields(formData)),
    },
  });
  revalidatePath("/locations");
  redirect("/locations");
}

export async function updateLocationAction(
  id: string,
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "拠点名を入力してください" };
  const note = String(formData.get("note") ?? "").trim();
  await prisma.location.update({
    where: { id },
    data: {
      name,
      note: note || null,
      fieldsJson: JSON.stringify(collectFields(formData)),
    },
  });
  revalidatePath("/locations");
  redirect("/locations");
}

export async function deleteLocationAction(id: string): Promise<void> {
  requireAuth();
  await prisma.location.delete({ where: { id } });
  revalidatePath("/locations");
  redirect("/locations");
}
