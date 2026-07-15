"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createContractAction,
  getTemplatePlaceholdersAction,
} from "@/app/actions/contracts";
import {
  FIELD_LABELS,
  DEFAULT_FIELD_VALUES,
  PAYMENT_PLANS,
  planOverrides,
  defaultsFor,
  isDateField,
  dateValueToIso,
  isoToJapaneseDate,
} from "@/lib/field-labels";

type TemplateOption = {
  id: string;
  title: string;
  category: string;
};

type StaffOption = { id: string; name: string };

type LocationOption = { id: string; name: string; fields: Record<string, string> };

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
  locations,
}: {
  templates: TemplateOption[];
  explanationTemplates: TemplateOption[];
  clients: ClientOption[];
  staffList: StaffOption[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [templateId, setTemplateId] = useState("");
  const [explanationTemplateId, setExplanationTemplateId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [planKey, setPlanKey] = useState(PAYMENT_PLANS[0].key);
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
    // 固定情報の初期値（拠点選択時は拠点値を優先）を未入力キーへ自動入力
    const base = defaultsFor(newKeys);
    const loc = locations.find((x) => x.id === locationId);
    if (loc) {
      for (const k of newKeys) {
        if (loc.fields[k] !== undefined) base[k] = loc.fields[k];
      }
    }
    Object.assign(base, planOverrides(planKey, newKeys));
    setFields((prev) => ({ ...base, ...prev }));
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

  // 拠点マスタの初期値を差し込み項目へ反映（支払区分の差分価格は維持）
  function applyLocation(id: string) {
    setLocationId(id);
    const loc = locations.find((x) => x.id === id);
    if (!loc) return;
    setFields((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (loc.fields[k] !== undefined) next[k] = loc.fields[k];
      }
      Object.assign(next, planOverrides(planKey, keys));
      return next;
    });
  }

  // 支払区分（年金・一般／生活保護）を切り替え、価格差のある項目を入れ替える
  function applyPlan(key: string) {
    setPlanKey(key);
    const affected = Array.from(
      new Set(PAYMENT_PLANS.flatMap((p) => Object.keys(p.values)))
    );
    const loc = locations.find((x) => x.id === locationId);
    setFields((prev) => {
      const next = { ...prev };
      // まず基準価格（拠点値があれば拠点値）へ戻してから、選択区分の価格を適用
      for (const k of affected) {
        if (!keys.includes(k)) continue;
        const base = loc?.fields[k] ?? DEFAULT_FIELD_VALUES[k];
        if (base !== undefined) next[k] = base;
      }
      Object.assign(next, planOverrides(key, keys));
      return next;
    });
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
        {locations.length > 0 && (
          <>
            <label htmlFor="location">拠点（物件・事業所）</label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => applyLocation(e.target.value)}
            >
              <option value="">― 選択して初期値を反映 ―</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="plan">支払区分</label>
        <select
          id="plan"
          value={planKey}
          onChange={(e) => applyPlan(e.target.value)}
        >
          {PAYMENT_PLANS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="hint">
          生活保護の方は市の支給基準に合わせた価格（礼金 138,000円）に切り替わります。
        </p>

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
                  {isDateField(k) ? (
                    // カレンダーで選択し、契約書へは「2026年7月4日」表記で差し込む
                    <input
                      id={`f_${k}`}
                      type="date"
                      value={dateValueToIso(fields[k] ?? "")}
                      onChange={(e) =>
                        setFields((prev) => ({
                          ...prev,
                          [k]: isoToJapaneseDate(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    <input
                      id={`f_${k}`}
                      type="text"
                      value={fields[k] ?? ""}
                      onChange={(e) =>
                        setFields((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>署名者（契約相手）</h2>
        <p className="hint">
          入居者・利用者などの氏名を入力します。メールアドレスは任意です。
          作成後、この端末に契約書を表示してその場で確認・サインしていただけます。
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
                <label>メールアドレス（任意）</label>
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
