"use client";

import { useFormState, useFormStatus } from "react-dom";

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string }>;

type Props = {
  action: Action;
  initial?: { name: string; email: string | null; phone: string | null };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "保存中..." : "保存"}
    </button>
  );
}

export function StaffForm({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction}>
      {state?.error && <div className="alert error">{state.error}</div>}
      <div className="grid2">
        <div>
          <label htmlFor="name">氏名</label>
          <input id="name" name="name" type="text" defaultValue={initial?.name} required />
        </div>
        <div>
          <label htmlFor="email">メールアドレス（任意）</label>
          <input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
          <p className="hint">締結時、契約PDFの控えがこのアドレスに届きます。</p>
        </div>
        <div>
          <label htmlFor="phone">連絡先（任意）</label>
          <input id="phone" name="phone" type="text" defaultValue={initial?.phone ?? ""} />
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: 20 }}>
        <SubmitButton />
        <a className="btn secondary" href="/staff">
          キャンセル
        </a>
      </div>
    </form>
  );
}
