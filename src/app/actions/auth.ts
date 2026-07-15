"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPasscode, getPasscode } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!passcode) {
    return { error: "パスワードを入力してください。" };
  }
  if (!getPasscode()) {
    return {
      error:
        "共通パスワードが未設定です。管理者は環境変数 APP_PASSCODE を設定してください。",
    };
  }
  if (!verifyPasscode(passcode)) {
    return { error: "パスワードが正しくありません。" };
  }

  // 初回アクセス時にDB（テーブル・テンプレート等）を自動セットアップ
  try {
    await ensureBootstrap();
  } catch (e) {
    console.error("bootstrap failed:", e);
    return {
      error:
        "データベースに接続できません。管理者は DATABASE_URL の設定を確認してください。",
    };
  }

  createSession();
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
