"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={pending}>
      {pending ? "確認中..." : "はじめる"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, {});
  return (
    <form action={formAction}>
      {state?.error && <div className="alert error">{state.error}</div>}
      <label htmlFor="passcode">共通パスワード</label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        placeholder="社内で共有しているパスワード"
        required
      />
      <p className="hint">
        一度入力すると、このブラウザでは30日間再入力は不要です。
      </p>
      <SubmitButton />
    </form>
  );
}
