"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContractSetAction } from "@/app/actions/contracts";
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

type LocationOption = { id: string; name: string; fields: Record<string, string> };

export function NewSetForm({
  sets,
  clients,
  staffList,
  locations,
}: {
  sets: SetOption[];
  clients: ClientOption[];
  staffList: StaffOption[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [setKey, setSetKey] = useState("");
  const [staffId, setStaffId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [planKey, setPlanKey] = useState(PAYMENT_PLANS[0].key);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selected = sets.find((s) => s.key === setKey);
  const keys = selected?.keys ?? [];

  // 拠点マスタの初期値を差し込み項目へ反映（対象セットのキーのみ・支払区分は維持）
  function applyLocation(id: string, targetKeys?: string[]) {
    setLocationId(id);
    const loc = locations.find((x) => x.id === id);
    if (!loc) return;
    const ks = targetKeys ?? keys;
    setFields((prev) => {
      const next = { ...prev };
      for (const k of ks) {
        if (loc.fields[k] !== undefined) next[k] = loc.fields[k];
      }
      Object.assign(next, planOverrides(planKey, ks));
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
        if (setKey === "nyukyo") {
          // 入居セットは、続けて初期費用の見積書・請求書を発行できるよう
          // 入力済みの部屋番号・入居日・金額を引き継いで見積・請求画面へ
          const params = new URLSearchParams({
            created: String(res.count),
            name: signerName.trim(),
          });
          const carry: [string, string | undefined][] = [
            ["room", fields.room_no],
            ["moveIn", dateValueToIso(fields.start_date ?? "")],
            ["property", fields.property_name],
            ["rent", fields.rent],
            ["fire", fields.fire_insurance],
            ["reikin", fields.reikin],
            ["bank", fields.bank_info],
          ];
          for (const [k, v] of carry) if (v) params.set(k, v);
          router.push(`/billing?${params.toString()}`);
        } else {
          router.push(`/contracts?q=${encodeURIComponent(signerName.trim())}`);
        }
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
            const key = e.target.value;
            setSetKey(key);
            // 固定情報（物件住所・金額・口座など）を初期値として自動入力
            const newKeys = sets.find((x) => x.key === key)?.keys ?? [];
            const base = defaultsFor(newKeys);
            const loc = locations.find((x) => x.id === locationId);
            if (loc) {
              for (const k of newKeys) {
                if (loc.fields[k] !== undefined) base[k] = loc.fields[k];
              }
            }
            Object.assign(base, planOverrides(planKey, newKeys));
            setFields(base);
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
            <p className="hint">
              拠点マスタに登録した住所・金額・口座などが差し込み項目へ自動入力されます。
            </p>
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
            <label htmlFor="signerEmail">メールアドレス（任意）</label>
            <input
              id="signerEmail"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
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
                {isDateField(k) ? (
                  // カレンダーで選択し、書類へは「2026年7月4日」表記で差し込む
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
