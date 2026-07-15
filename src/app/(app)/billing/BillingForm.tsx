"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_FIELD_VALUES,
  PAYMENT_PLANS,
  planOverrides,
} from "@/lib/field-labels";
import { buildInitialCostItems, parseAmount, yen } from "@/lib/billing";
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

// 画面で編集する明細の1行（金額は編集しやすいよう文字列で保持）
type Row = { name: string; price: string; qty: string; note: string };

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
  const [water, setWater] = useState(DEFAULT_FIELD_VALUES.water_fee || "");
  const [utilities, setUtilities] = useState(
    DEFAULT_FIELD_VALUES.utility_fee || ""
  );
  const [bank, setBank] = useState(
    initial?.bank || DEFAULT_FIELD_VALUES.bank_info || ""
  );

  // 編集可能な明細
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // 上の入力（入居日・各金額）が変わったら、標準明細を再計算して表へ反映する。
  // 表を手で編集・追加した内容は、上の入力を変えるまで保持される。
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) {
      setRows([]);
      return;
    }
    const items = buildInitialCostItems({
      moveInIso: moveIn,
      rent: parseAmount(rent),
      fireInsurance: parseAmount(fire),
      reikin: parseAmount(reikin),
      waterFee: parseAmount(water),
      utilities: parseAmount(utilities),
    });
    setRows(
      items.map((i) => ({
        name: i.name,
        price: String(i.unitPrice),
        qty: String(i.qty),
        note: i.note ?? "",
      }))
    );
  }, [moveIn, rent, fire, reikin, water, utilities]);

  const total = rows.reduce(
    (s, r) => s + parseAmount(r.price) * (parseInt(r.qty, 10) || 1),
    0
  );

  // 拠点・支払区分から基準金額を求める（拠点値 > 既定値、礼金は支払区分の差分を適用）
  function baseValues(locId: string, plan: string) {
    const loc = locations.find((x) => x.id === locId);
    const pick = (k: string) => loc?.fields[k] || DEFAULT_FIELD_VALUES[k] || "";
    const v = {
      property: pick("property_name"),
      rent: pick("rent"),
      fire: pick("fire_insurance"),
      reikin: pick("reikin"),
      water: pick("water_fee"),
      utilities: pick("utility_fee"),
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
    setWater(v.water);
    setUtilities(v.utilities);
    setBank(v.bank);
  }

  function applyPlan(key: string) {
    setPlanKey(key);
    const v = baseValues(locationId, key);
    setRent(v.rent);
    setFire(v.fire);
    setReikin(v.reikin);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { name: "", price: "", qty: "1", note: "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function open(docType: "quote" | "invoice") {
    setError(null);
    if (!name.trim()) {
      setError("宛名（氏名）を入力してください。");
      return;
    }
    const itemsPayload = rows
      .map((r) => ({
        name: r.name.trim(),
        unitPrice: parseAmount(r.price),
        qty: parseInt(r.qty, 10) || 1,
        note: r.note.trim() || undefined,
      }))
      .filter((r) => r.name);
    if (itemsPayload.length === 0) {
      setError("明細を1行以上入力してください。");
      return;
    }
    const params = new URLSearchParams({
      type: docType,
      name: name.trim(),
      room: room.trim(),
      property: property.trim(),
      due: due || moveIn,
      bank: bank.trim(),
      items: JSON.stringify(itemsPayload),
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
        <h2 style={{ marginTop: 0 }}>基準金額（変更すると下の明細に反映されます）</h2>
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
          <div>
            <label htmlFor="water">水道代(円・定額)</label>
            <input
              id="water"
              type="text"
              value={water}
              onChange={(e) => setWater(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="utilities">光熱費(円・定額)</label>
            <input
              id="utilities"
              type="text"
              value={utilities}
              onChange={(e) => setUtilities(e.target.value)}
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
        <p className="hint" style={{ marginTop: 6 }}>
          水道代・光熱費は日割りせず定額で計上します。金額は下の明細で個別に調整できます。
        </p>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>明細（摘要・金額を編集、追加・削除できます）</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>摘要</th>
                <th style={{ minWidth: 110 }}>単価(円)</th>
                <th style={{ width: 70 }}>数量</th>
                <th style={{ minWidth: 110, textAlign: "right" }}>小計</th>
                <th style={{ minWidth: 140 }}>備考</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={r.price}
                      onChange={(e) => updateRow(i, { price: e.target.value })}
                      style={{ textAlign: "right" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={r.qty}
                      onChange={(e) => updateRow(i, { qty: e.target.value })}
                      style={{ textAlign: "center" }}
                    />
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {yen(parseAmount(r.price) * (parseInt(r.qty, 10) || 1))}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={r.note}
                      onChange={(e) => updateRow(i, { note: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="btn danger"
                      style={{ padding: "4px 10px" }}
                      onClick={() => removeRow(i)}
                      aria-label="この行を削除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ textAlign: "right" }}>
                  <strong>ご請求額合計（税込）</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <strong>{yen(total)}</strong>
                </td>
                <td className="muted" colSpan={2}>
                  ※家賃等は消費税非課税
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn secondary" onClick={addRow}>
            ＋ 明細を追加
          </button>
        </div>
      </div>

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
        PDFは上の明細の内容そのままで出力されます。摘要・金額の変更や、行の追加・削除も反映されます。
      </p>
    </form>
  );
}
