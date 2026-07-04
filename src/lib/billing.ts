// 初期費用の見積書・請求書の明細組み立て（社内の見積書フォーマットを踏襲）

export type BillingItem = {
  name: string;
  unitPrice: number;
  qty: number;
  note?: string;
};

export function parseAmount(v: string | null | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[¥,\s円]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

// 入居日に基づいて初期費用の明細を組み立てる。
// 例）入居日 6/30・家賃40,000 → 日割り家賃 ¥1,333（1日分）＋ 7月分家賃 ¥40,000
export function buildInitialCostItems(input: {
  moveInIso: string; // 入居日（YYYY-MM-DD）
  rent: number; // 月額家賃
  fireInsurance: number; // 火災保険料（2年間分）
  reikin: number; // 礼金
}): BillingItem[] {
  const items: BillingItem[] = [];
  const m = input.moveInIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && input.rent > 0) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const nextMo = mo === 12 ? 1 : mo + 1;
    if (d === 1) {
      // 1日入居は日割り不要。当月分＋翌月分
      items.push({ name: `${mo}月分家賃`, unitPrice: input.rent, qty: 1 });
    } else {
      const remainDays = daysInMonth - d + 1;
      const daily = Math.floor((input.rent * remainDays) / daysInMonth);
      items.push({
        name: "日割り家賃",
        unitPrice: daily,
        qty: 1,
        note: `入居日 ${mo}月${d}日〜${mo}月${daysInMonth}日（${remainDays}日分）`,
      });
    }
    items.push({ name: `${nextMo}月分家賃`, unitPrice: input.rent, qty: 1 });
  }
  if (input.fireInsurance > 0) {
    items.push({
      name: "火災保険料",
      unitPrice: input.fireInsurance,
      qty: 1,
      note: "2年間分",
    });
  }
  if (input.reikin > 0) {
    items.push({ name: "礼金", unitPrice: input.reikin, qty: 1 });
  }
  return items;
}

export function totalOf(items: BillingItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}
