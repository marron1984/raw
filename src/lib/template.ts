// 契約本文中の {{key}} プレースホルダを実際の値で差し込む

const PLACEHOLDER_RE = /\{\{\s*([\w.\-]+)\s*\}\}/g;

// 本文から差し込み項目のキー一覧を抽出（重複除去・出現順）
export function extractPlaceholders(body: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(body)) !== null) {
    const key = m[1];
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

// プレースホルダに値を差し込む。未入力の項目は ____ で残す
export function renderTemplate(
  body: string,
  values: Record<string, string>
): string {
  return body.replace(PLACEHOLDER_RE, (_full, key: string) => {
    const v = values[key];
    return v != null && v !== "" ? v : "＿＿＿＿＿＿";
  });
}

export const CATEGORY_LABELS: Record<string, string> = {
  RESIDENCE: "入居契約",
  CARE: "訪問介護利用契約",
  OTHER: "その他",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送信済み",
  VIEWED: "閲覧済み",
  SIGNED: "署名済み",
  DECLINED: "拒否",
  CANCELLED: "取消",
};

export const SIGNER_STATUS_LABELS: Record<string, string> = {
  PENDING: "未署名",
  VIEWED: "閲覧済み",
  SIGNED: "署名済み",
  DECLINED: "拒否",
};
