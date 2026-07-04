// 差し込み項目キーの日本語ラベル（契約作成フォームで共用）
export const FIELD_LABELS: Record<string, string> = {
  tenant_name: "借主氏名",
  tenant_address: "借主住所",
  tenant_phone: "借主連絡先",
  tenant_workplace: "借主勤務先",
  guarantor_name: "連帯保証人氏名",
  guarantor_address: "連帯保証人住所",
  guarantor_phone: "連帯保証人連絡先",
  guarantor_relation: "続柄",
  property_name: "物件名称",
  property_address: "物件所在地",
  room_no: "部屋番号",
  structure: "構造・面積",
  area: "居室面積",
  rent: "賃料(円)",
  common_fee: "共益費(円)",
  management_fee: "管理費(円)",
  water_fee: "水道料金(円)",
  monthly_total: "月額合計(円)",
  reikin: "礼金(円)",
  fire_insurance: "火災保険料(円)",
  bank_info: "振込先口座",
  deposit: "敷金(円)",
  key_number: "鍵番号",
  key_count: "鍵の本数",
  handover_date: "受渡日",
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
  agent_relation: "本人との続柄",
};

// Excel（入居セット等）に記入されていた固定情報を初期値として自動入力する。
// 物件や条件が異なる場合は作成画面でそのまま編集できる。
export const DEFAULT_FIELD_VALUES: Record<string, string> = {
  property_name: "いいすまい塚本（パシフィック塚本）",
  property_address: "大阪市西淀川区野里一丁目32-14",
  structure: "鉄骨造7階建 総戸数96戸・面積15.21㎡（但し造作一式付）",
  area: "15.21㎡",
  rent: "40,000",
  common_fee: "5,000",
  management_fee: "5,000",
  water_fee: "2,000",
  monthly_total: "52,000",
  fire_insurance: "22,000",
  reikin: "160,000",
  bank_info:
    "GMOあおぞらネット銀行 法人営業部 普通2604720 ｶ)ﾃﾞｨｰｴｯﾁﾋﾟｰｹｱﾏﾈｼﾞﾒﾝﾄ",
  key_count: "1",
  office_name: "いいかいご",
};

// 日付系のキー（作成フォームでカレンダー入力にする）
export function isDateField(key: string): boolean {
  return /_date$/.test(key);
}

// 「2026年7月4日」「2026/7/4」「2026-07-04」→ input type="date" 用のISO表記
export function dateValueToIso(value: string): string {
  const m = value
    .trim()
    .match(/^(\d{4})[年/\-](\d{1,2})[月/\-](\d{1,2})日?$/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// ISO表記 → 契約書に差し込む日本語表記（2026年7月4日）
export function isoToJapaneseDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

// 指定キーに対する初期値を返す（定義があるものだけ）
export function defaultsFor(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (DEFAULT_FIELD_VALUES[k] !== undefined) out[k] = DEFAULT_FIELD_VALUES[k];
  }
  return out;
}
