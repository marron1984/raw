"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createContractAction,
  getTemplatePlaceholdersAction,
} from "@/app/actions/contracts";
import { FIELD_LABELS, defaultsFor } from "@/lib/field-labels";

type TemplateOption = {
  id: string;
  title: string;
  category: string;
};

type StaffOption = { id: string; name: string };

type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};


type Signer = { name: string; email: string };

export function NewContractForm({
  templates,
  explanationTemplates,
  clients,
  staffList,
}: {
  templates: TemplateOption[];
  explanationTemplates: TemplateOption[];
  clients: ClientOption[];
  staffList: StaffOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [templateId, setTemplateId] = useState("");
  const [explanationTemplateId, setExplanationTemplateId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [contractKeys, setContractKeys] = useState<string[]>([]);
  const [explanationKeys, setExplanationKeys] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loadingTpl, setLoadingTpl] = useState(false);

  // 契約＋重説の差し込み項目を結合（重複除去・出現順）
  const keys = Array.from(new Set([...contractKeys, ...explanationKeys]));

  async function onTemplateChange(id: string) {
    setTemplateId(id);
    setFields({});
    if (!id) {
      setContractKeys([]);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl && !title) setTitle(tpl.title);
    setLoadingTpl(true);
    const res = await getTemplatePlaceholdersAction(id);
    setLoadingTpl(false);
    const newKeys = res?.keys ?? [];
    setContractKeys(newKeys);
    // 固定情報の初期値を未入力キーへ自動入力
    setFields((prev) => ({ ...defaultsFor(newKeys), ...prev }));
  }

  async function onExplanationChange(id: string) {
    setExplanationTemplateId(id);
    if (!id) {
      setExplanationKeys([]);
      return;
    }
    const res = await getTemplatePlaceholdersAction(id);
    const newKeys = res?.keys ?? [];
    setExplanationKeys(newKeys);
    setFields((prev) => ({ ...defaultsFor(newKeys), ...prev }));
  }

  // 相手先マスタから署名者・差し込み項目を補完
  function applyClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setSigners((prev) => {
      const next = [...prev];
      next[0] = { name: c.name, email: c.email ?? "" };
      return next;
    });
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

  function updateSigner(i: number, patch: Partial<Signer>) {
    setSigners((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createContractAction({
        templateId,
        explanationTemplateId: explanationTemplateId || undefined,
        staffId: staffId || undefined,
        title,
        fields,
        signers: signers
          .map((s) => ({ name: s.name.trim(), email: s.email.trim() }))
          .filter((s) => s.name || s.email),
      });
      if (res.ok) {
        router.push(`/contracts/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}

      {clients.length > 0 && (
        <div className="panel">
          <label htmlFor="client">相手先マスタから選択（任意）</label>
          <select
            id="client"
            defaultValue=""
            onChange={(e) => applyClient(e.target.value)}
          >
            <option value="">― 選択して署名者・項目を自動入力 ―</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.email ? `（${c.email}）` : ""}
              </option>
            ))}
          </select>
          <p className="hint">
            登録済みの相手先を選ぶと、署名者と住所・連絡先などを自動入力します（編集可）。
          </p>
        </div>
      )}

      <div className="panel">
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

        <label htmlFor="template">テンプレート</label>
        <select
          id="template"
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          required
        >
          <option value="">― 選択してください ―</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        {explanationTemplates.length > 0 && (
          <>
            <label htmlFor="explanation">重要事項説明書（任意）</label>
            <select
              id="explanation"
              value={explanationTemplateId}
              onChange={(e) => onExplanationChange(e.target.value)}
            >
              <option value="">― 添付しない ―</option>
              {explanationTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="hint">
              選ぶと、契約と同じ差し込み内容で重要事項説明書を作成し、署名ページで契約と一緒に同意を取得します。
            </p>
          </>
        )}

        <label htmlFor="title">契約タイトル</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {templateId && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>差し込み項目</h2>
          {loadingTpl ? (
            <p className="muted">読み込み中...</p>
          ) : keys.length === 0 ? (
            <p className="muted">このテンプレートに差し込み項目はありません。</p>
          ) : (
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
          )}
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>署名者（契約相手）</h2>
        <p className="hint">
          入居者・利用者などの氏名とメールアドレスを入力します。契約作成後、署名用URLを案内できます。
        </p>
        {signers.map((s, i) => (
          <div key={i} className="signer-card">
            <div className="grid2">
              <div>
                <label>氏名</label>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateSigner(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label>メールアドレス</label>
                <input
                  type="email"
                  value={s.email}
                  onChange={(e) => updateSigner(i, { email: e.target.value })}
                />
              </div>
            </div>
            {signers.length > 1 && (
              <button
                type="button"
                className="btn secondary"
                style={{ marginTop: 10, padding: "4px 10px" }}
                onClick={() =>
                  setSigners((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                削除
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn secondary"
          onClick={() => setSigners((prev) => [...prev, { name: "", email: "" }])}
        >
          ＋ 署名者を追加
        </button>
      </div>

      <div className="btn-row">
        <button className="btn" disabled={isPending}>
          {isPending ? "作成中..." : "契約を作成（下書き）"}
        </button>
        <a className="btn secondary" href="/contracts">
          キャンセル
        </a>
      </div>
    </form>
  );
}
