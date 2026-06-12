"use client";

import { useFormState, useFormStatus } from "react-dom";

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string }>;

type Props = {
  action: Action;
  initial?: {
    name: string;
    kana: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    category: string;
    note: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "保存中..." : "保存"}
    </button>
  );
}

export function ClientForm({ action, initial }: Props) {
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
          <label htmlFor="kana">フリガナ（任意）</label>
          <input id="kana" name="kana" type="text" defaultValue={initial?.kana ?? ""} />
        </div>
        <div>
          <label htmlFor="email">メールアドレス（任意）</label>
          <input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </div>
        <div>
          <label htmlFor="phone">連絡先（任意）</label>
          <input id="phone" name="phone" type="text" defaultValue={initial?.phone ?? ""} />
        </div>
        <div>
          <label htmlFor="category">種別</label>
          <select id="category" name="category" defaultValue={initial?.category ?? "OTHER"}>
            <option value="RESIDENCE">入居者</option>
            <option value="CARE">訪問介護利用者</option>
            <option value="OTHER">その他</option>
          </select>
        </div>
      </div>
      <label htmlFor="address">住所（任意）</label>
      <input id="address" name="address" type="text" defaultValue={initial?.address ?? ""} />
      <label htmlFor="note">メモ（任意）</label>
      <input id="note" name="note" type="text" defaultValue={initial?.note ?? ""} />
      <div className="btn-row" style={{ marginTop: 20 }}>
        <SubmitButton />
        <a className="btn secondary" href="/clients">
          キャンセル
        </a>
      </div>
    </form>
  );
}
