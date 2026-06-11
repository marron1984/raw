"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください"),
  email: z.string().trim().email("正しいメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function createUserAction(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) {
    return { error: "そのメールアドレスは既に登録されています。" };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUserActiveAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === id) return; // 自分自身は無効化できない
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });
  revalidatePath("/users");
}
