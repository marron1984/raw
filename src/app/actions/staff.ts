"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください"),
  email: z
    .string()
    .trim()
    .email("正しいメールアドレスを入力してください")
    .or(z.literal("")),
  phone: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
  });
}

export async function createStaffAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, ...rest } = parsed.data;
  await prisma.staff.create({ data: { ...rest, email: email || null } });
  revalidatePath("/staff");
  redirect("/staff");
}

export async function updateStaffAction(
  id: string,
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, ...rest } = parsed.data;
  await prisma.staff.update({
    where: { id },
    data: { ...rest, email: email || null },
  });
  revalidatePath("/staff");
  redirect("/staff");
}

export async function toggleStaffActiveAction(id: string): Promise<void> {
  requireAuth();
  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) return;
  await prisma.staff.update({
    where: { id },
    data: { isActive: !staff.isActive },
  });
  revalidatePath("/staff");
}

export async function deleteStaffAction(id: string): Promise<void> {
  requireAuth();
  await prisma.staff.delete({ where: { id } });
  revalidatePath("/staff");
  redirect("/staff");
}
