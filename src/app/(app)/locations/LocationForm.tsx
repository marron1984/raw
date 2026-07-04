"use client";

import { useFormState, useFormStatus } from "react-dom";
import { FIELD_LABELS } from "@/lib/field-labels";

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string }>;

type Props = {
  action: Action;
  initial?: {
    name: string;
    note: string | null;
    fields: Record<string, string>;
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

export function LocationForm({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {});
  const fields = initial?.fields ?? {};

  return (
    <form action={formAction}>
      {state?.error && <div className="alert error">{state.error}</div>}

      <div className="grid2">
        <div>
          <label htmlFor="name">拠点名</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initial?.name}
            placeholder="例：いいすまい塚本"
            required
          />
        </div>
        <div>
          <label htmlFor="note">メモ（任意）</label>
          <input id="note" name="note" type="text" defaultValue={initial?.note ?? ""} />
        </div>
      </div>

      <h2>差し込み初期値</h2>
      <p className="hint">
        この拠点を選んだとき、契約書の差し込み項目へ自動入力される値です。使わない項目は空欄のままで構いません。
      </p>
      <div className="grid2">
        {Object.entries(FIELD_LABELS).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`f_${key}`}>{label}</label>
            <input
              id={`f_${key}`}
              name={`f_${key}`}
              type="text"
              defaultValue={fields[key] ?? ""}
            />
          </div>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 20 }}>
        <SubmitButton />
        <a className="btn secondary" href="/locations">
          キャンセル
        </a>
      </div>
    </form>
  );
}
