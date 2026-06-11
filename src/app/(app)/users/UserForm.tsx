"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createUserAction } from "@/app/actions/users";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "登録中..." : "ユーザーを登録"}
    </button>
  );
}

export function UserForm() {
  const [state, formAction] = useFormState(createUserAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form action={formAction} ref={formRef}>
      {state?.error && <div className="alert error">{state.error}</div>}
      {state?.ok && <div className="alert success">ユーザーを登録しました。</div>}
      <div className="grid2">
        <div>
          <label htmlFor="name">氏名</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="password">初期パスワード（8文字以上）</label>
          <input id="password" name="password" type="text" required />
        </div>
        <div>
          <label htmlFor="role">権限</label>
          <select id="role" name="role" defaultValue="STAFF">
            <option value="STAFF">職員</option>
            <option value="ADMIN">管理者</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <SubmitButton />
      </div>
    </form>
  );
}
