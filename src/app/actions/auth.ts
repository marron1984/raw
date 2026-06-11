"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import {
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  // 初回アクセス時にDB（テーブル・初期管理者）を自動セットアップ
  try {
    await ensureBootstrap();
  } catch (e) {
    console.error("bootstrap failed:", e);
    return {
      error:
        "データベースに接続できません。管理者は DATABASE_URL の設定を確認してください。",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
