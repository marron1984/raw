"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_FIELD_VALUES,
  PAYMENT_PLANS,
  planOverrides,
} from "@/lib/field-labels";
import { buildInitialCostItems, parseAmount, totalOf, yen } from "@/lib/billing";
import { createRoomExplanationAction } from "@/app/actions/contracts";

type LocationOption = { id: string; name: string; fields: Record<string, string> };

// 入居セット作成画面などから引き継ぐ初期値
type BillingInitial = {
  name?: string;
  room?: string;
  moveIn?: string;
  due?: string;
  property?: string;
  rent?: string;
  fire?: string;
  reikin?: string;
  bank?: string;
};

export function BillingForm({
  locations,
  initial,
}: {
  locations: LocationOption[];
  initial?: BillingInitial;
}) {
  const [locationId, setLocationId] = useState("");
  const [planKey, setPlanKey] = useState(PAYMENT_PLANS[0].key);
  const [name, setName] = useState(initial?.name ?? "");
  const [room, setRoom] = useState(initial?.room ?? "");
  const [moveIn, setMoveIn] = useState(initial?.moveIn ?? "");
  const [due, setDue] = useState(initial?.due ?? initial?.moveIn ?? "");
  const [property, setProperty] = useState(
    initial?.property || DEFAULT_FIELD_VALUES.property_name || ""
  );
  const [rent, setRent] = useState(
    initial?.rent || DEFAULT_FIELD_VALUES.rent || ""
  );
  const [fire, setFire] = useState(
    initial?.fire || DEFAULT_FIELD_VALUES.fire_insurance || ""
  );
  const [reikin, setReikin] = useState(
    initial?.reikin || DEFAULT_FIELD_VALUES.reikin || ""
  );
  const [bank, setBank] = useState(
    initial?.bank || DEFAULT_FIELD_VALUES.bank_info || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // 拠点・支払区分から基準金額を求める（拠点値 > 既定値、礼金は支払区分の差分を適用）
  function baseValues(locId: string, plan: string) {
    const loc = locations.find((x) => x.id === locId);
    const pick = (k: string) => loc?.fields[k] || DEFAULT_FIELD_VALUES[k] || "";
    const v = {
      property: pick("property_name"),
      rent: pick("rent"),
      fire: pick("fire_insurance"),
      reikin: pick("reikin"),
      bank: pick("bank_info"),
    };
    const over = planOverrides(plan, ["reikin", "rent", "fire_insurance"]);
    if (over.reikin !== undefined) v.reikin = over.reikin;
    if (over.rent !== undefined) v.rent = over.rent;
    if (over.fire_insurance !== undefined) v.fire = over.fire_insurance;
    return v;
  }

  function applyLocation(id: string) {
    setLocationId(id);
    const v = baseValues(id, planKey);
    setProperty(v.property);
    setRent(v.rent);
    setFire(v.fire);
    setReikin(v.reikin);
    setBank(v.bank);
  }

  function applyPlan(key: string) {
    setPlanKey(key);
    const v = baseValues(locationId, key);
    setRent(v.rent);
    setFire(v.fire);
    setReikin(v.reikin);
  }

  // 明細プレビュー（PDFと同じ計算）
  const items = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) return [];
    return buildInitialCostItems({
      moveInIso: moveIn,
      rent: parseAmount(rent),
      fireInsurance: parseAmount(fire),
      reikin: parseAmount(reikin),
    });
  }, [moveIn, rent, fire, reikin]);

  function open(docType: "quote" | "invoice") {
    setError(null);
    if (!name.trim()) {
      setError("宛名（氏名）を入力してください。");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) {
      setError("入居日を選択してください。");
      return;
    }
    const params = new URLSearchParams({
      type: docType,
      name: name.trim(),
      room: room.trim(),
      property: property.trim(),
      moveIn,
      due: due || moveIn,
      rent,
      fire,
      reikin,
      bank: bank.trim(),
    });
    window.open(`/api/billing/pdf?${params.toString()}`, "_blank");
  }

  // 入居予定の部屋の重要事項説明書だけを作成し、詳細画面（署名・PDF）へ進む
  async function createExplanation() {
    setError(null);
    if (!name.trim()) {
      setError("宛名（氏名）を入力してください。");
      return;
    }
    setCreating(true);
    const res = await createRoomExplanationAction({
      name: name.trim(),
      room: room.trim(),
      property: property.trim(),
      rent,
      fire,
      reikin,
      bank: bank.trim(),
      moveInIso: /^\d{4}-\d{2}-\d{2}$/.test(moveIn) ? moveIn : undefined,
    });
    setCreating(false);
    if (res.ok) {
      router.push(`/contracts/${res.id}`);
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        {locations.length > 0 && (
          <>
            <label htmlFor="location">拠点（物件）</label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => applyLocation(e.target.value)}
            >
              <option value="">― 選択して金額を自動入力 ―</option>
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

        <div className="grid2">
          <div>
            <label htmlFor="name">宛名（氏名）</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="room">部屋番号</label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="例：413"
            />
          </div>
          <div>
            <label htmlFor="moveIn">入居日</label>
            <input
              id="moveIn"
              type="date"
              value={moveIn}
              onChange={(e) => {
                setMoveIn(e.target.value);
                if (!due) setDue(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <label htmlFor="due">お支払い期限</label>
            <input
              id="due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>金額（編集可）</h2>
        <div className="grid2">
          <div>
            <label htmlFor="property">物件名称</label>
            <input
              id="property"
              type="text"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rent">月額家賃(円)</label>
            <input
              id="rent"
              type="text"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fire">火災保険料(円・2年間分)</label>
            <input
              id="fire"
              type="text"
              value={fire}
              onChange={(e) => setFire(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reikin">礼金(円)</label>
            <input
              id="reikin"
              type="text"
              value={reikin}
              onChange={(e) => setReikin(e.target.value)}
            />
          </div>
        </div>
        <label htmlFor="bank">振込先口座</label>
        <input
          id="bank"
          type="text"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
      </div>

      {items.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>明細プレビュー</h2>
          <table>
            <thead>
              <tr>
                <th>内容</th>
                <th style={{ textAlign: "right" }}>小計</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.name}>
                  <td>{i.name}</td>
                  <td style={{ textAlign: "right" }}>
                    {yen(i.unitPrice * i.qty)}
                  </td>
                  <td className="muted">{i.note ?? ""}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>ご請求額合計（税込）</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <strong>{yen(totalOf(items))}</strong>
                </td>
                <td className="muted">※家賃等は消費税非課税</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="btn-row">
        <button className="btn" onClick={() => open("quote")}>
          見積書PDFを発行
        </button>
        <button className="btn success" onClick={() => open("invoice")}>
          請求書PDFを発行
        </button>
        <button
          className="btn secondary"
          onClick={createExplanation}
          disabled={creating}
        >
          {creating ? "作成中..." : "重要事項説明書を作成"}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        「重要事項説明書を作成」は、この画面の宛名・部屋番号・入居日・金額を差し込んだ
        重要事項説明書（賃貸借）を単独で作成します。作成後の画面から
        「現在の内容をPDFで確認」で印刷、または「契約書を表示して署名へ」でその場での説明・署名ができます。
      </p>
    </form>
  );
}
