"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
      {pending ? "ログイン中..." : "ログイン"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, {});
  return (
    <form action={formAction}>
      {state?.error && <div className="alert error">{state.error}</div>}
      <label htmlFor="email">メールアドレス</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">パスワード</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton />
    </form>
  );
}
