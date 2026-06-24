"use client";

import { useFormState, useFormStatus } from "react-dom";

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string }>;

type Props = {
  action: Action;
  initial?: {
    title: string;
    category: string;
    description: string | null;
    body: string;
    isActive: boolean;
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

export function TemplateForm({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction}>
      {state?.error && <div className="alert error">{state.error}</div>}

      <label htmlFor="title">テンプレート名</label>
      <input id="title" name="title" type="text" defaultValue={initial?.title} required />

      <label htmlFor="category">契約種別</label>
      <select id="category" name="category" defaultValue={initial?.category ?? "OTHER"}>
        <option value="RESIDENCE">入居契約</option>
        <option value="CARE">訪問介護利用契約</option>
        <option value="CAREPLAN">居宅介護支援（ケアマネ）</option>
        <option value="DISABILITY">障害福祉サービス契約</option>
        <option value="EXPLANATION">重要事項説明書</option>
        <option value="CONSENT">同意書</option>
        <option value="OTHER">その他</option>
      </select>

      <label htmlFor="description">説明（任意）</label>
      <input
        id="description"
        name="description"
        type="text"
        defaultValue={initial?.description ?? ""}
      />

      <label htmlFor="body">契約本文</label>
      <textarea id="body" name="body" defaultValue={initial?.body} required />
      <p className="hint">
        差し込み項目は <code>{"{{key}}"}</code> の形式で記述します（例：
        <code>{"{{tenant_name}}"}</code>）。契約作成時にこの項目へ値を入力できます。
      </p>

      <div className="checkbox-row" style={{ marginTop: 14 }}>
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          defaultChecked={initial ? initial.isActive : true}
        />
        <label htmlFor="isActive" style={{ margin: 0 }}>
          有効（契約作成時の選択肢に表示する）
        </label>
      </div>

      <div className="btn-row" style={{ marginTop: 20 }}>
        <SubmitButton />
        <a className="btn secondary" href="/templates">
          キャンセル
        </a>
      </div>
    </form>
  );
}
