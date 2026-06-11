"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createContractAction,
  getTemplatePlaceholdersAction,
} from "@/app/actions/contracts";

type TemplateOption = {
  id: string;
  title: string;
  category: string;
};

// プレースホルダのキーを日本語ラベルへ（無ければキーをそのまま表示）
const FIELD_LABELS: Record<string, string> = {
  tenant_name: "借主氏名",
  tenant_address: "借主住所",
  tenant_phone: "借主連絡先",
  property_name: "物件名称",
  property_address: "物件所在地",
  room_no: "部屋番号",
  rent: "賃料(円)",
  common_fee: "共益費(円)",
  deposit: "敷金(円)",
  start_date: "開始日",
  end_date: "終了日",
  user_name: "利用者氏名",
  birth_date: "生年月日",
  user_address: "利用者住所",
  user_phone: "利用者連絡先",
  insurance_no: "被保険者番号",
  service_type: "サービス種別",
  schedule: "利用曜日・時間",
  office_name: "担当事業所",
  contract_date: "契約締結年月日",
  agent_name: "代理人氏名",
  agent_address: "代理人住所",
};

type Signer = { name: string; email: string };

export function NewContractForm({ templates }: { templates: TemplateOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loadingTpl, setLoadingTpl] = useState(false);

  async function onTemplateChange(id: string) {
    setTemplateId(id);
    setFields({});
    if (!id) {
      setKeys([]);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl && !title) setTitle(tpl.title);
    setLoadingTpl(true);
    const res = await getTemplatePlaceholdersAction(id);
    setLoadingTpl(false);
    setKeys(res?.keys ?? []);
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

      <div className="panel">
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
