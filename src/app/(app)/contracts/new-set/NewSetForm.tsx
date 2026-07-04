"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContractSetAction } from "@/app/actions/contracts";
import { FIELD_LABELS } from "@/lib/field-labels";

type SetOption = {
  key: string;
  label: string;
  description: string;
  docTitles: string[];
  keys: string[];
};

type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type StaffOption = { id: string; name: string };

export function NewSetForm({
  sets,
  clients,
  staffList,
}: {
  sets: SetOption[];
  clients: ClientOption[];
  staffList: StaffOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [setKey, setSetKey] = useState("");
  const [staffId, setStaffId] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selected = sets.find((s) => s.key === setKey);
  const keys = selected?.keys ?? [];

  // 相手先マスタから署名者・差し込み項目を補完
  function applyClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setSignerName(c.name);
    setSignerEmail(c.email ?? "");
    setFields((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (/^(user|tenant)_name$/.test(k)) next[k] = c.name;
        else if (/^(user|tenant)_address$/.test(k) && c.address)
          next[k] = c.address;
        else if (/^(user|tenant)_phone$/.test(k) && c.phone) next[k] = c.phone;
      }
      return next;
    });
  }

  // 署名者名を差し込み項目（氏名系）にも反映
  function onSignerNameChange(v: string) {
    setSignerName(v);
    setFields((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (/^(user|tenant)_name$/.test(k)) next[k] = v;
      }
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createContractSetAction({
        setKey,
        staffId: staffId || undefined,
        fields,
        signer: { name: signerName.trim(), email: signerEmail.trim() },
      });
      if (res.ok) {
        router.push(`/contracts?q=${encodeURIComponent(signerName.trim())}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        <label htmlFor="set">書類セット</label>
        <select
          id="set"
          value={setKey}
          onChange={(e) => {
            setSetKey(e.target.value);
            setFields({});
          }}
          required
        >
          <option value="">― 選択してください ―</option>
          {sets.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}（{s.description}）
            </option>
          ))}
        </select>
        {selected && (
          <div className="hint" style={{ marginTop: 8 }}>
            作成される書類：
            <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
              {selected.docTitles.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {staffList.length > 0 && (
          <>
            <label htmlFor="staff">担当者</label>
            <select
              id="staff"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">― 選択してください ―</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>署名者（契約相手）</h2>
        {clients.length > 0 && (
          <>
            <label htmlFor="client">相手先マスタから選択（任意）</label>
            <select
              id="client"
              defaultValue=""
              onChange={(e) => applyClient(e.target.value)}
            >
              <option value="">― 選択して自動入力 ―</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? `（${c.email}）` : ""}
                </option>
              ))}
            </select>
          </>
        )}
        <div className="grid2">
          <div>
            <label htmlFor="signerName">氏名</label>
            <input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => onSignerNameChange(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="signerEmail">メールアドレス</label>
            <input
              id="signerEmail"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {selected && keys.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>共通の差し込み項目</h2>
          <p className="hint">
            ここに入力した内容が、セット内のすべての書類へ反映されます。
          </p>
          <div className="grid2">
            {keys.map((k) => (
              <div key={k}>
                <label htmlFor={`f_${k}`}>{FIELD_LABELS[k] ?? k}</label>
                <input
                  id={`f_${k}`}
                  type="text"
                  value={fields[k] ?? ""}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [k]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn" disabled={isPending || !setKey}>
          {isPending
            ? "作成中..."
            : selected
              ? `${selected.docTitles.length}件の書類をまとめて作成`
              : "書類セットを作成"}
        </button>
        <a className="btn secondary" href="/contracts">
          キャンセル
        </a>
      </div>
    </form>
  );
}
