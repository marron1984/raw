"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください"),
  kana: z.string().trim().optional(),
  email: z.string().trim().email("正しいメールアドレスを入力してください").or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  category: z.enum(["RESIDENCE", "CARE", "OTHER"]),
  note: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    kana: formData.get("kana") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    category: formData.get("category"),
    note: formData.get("note") || undefined,
  });
}

export async function createClientAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, ...rest } = parsed.data;
  await prisma.client.create({
    data: { ...rest, email: email || null, createdById: null },
  });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientAction(
  id: string,
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, ...rest } = parsed.data;
  await prisma.client.update({
    where: { id },
    data: { ...rest, email: email || null },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect("/clients");
}

export async function deleteClientAction(id: string): Promise<void> {
  requireAuth();
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
