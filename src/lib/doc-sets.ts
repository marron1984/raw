// 書類セットの定義（Excelの「入居セット」相当）。
// 共通の差し込み項目を1回入力するだけで、セット内の全書類を一括作成する。
// items はテンプレートのタイトルで参照する（seed-core のタイトルと一致させること）。

export type DocSetItem = {
  templateTitle: string;
  explanationTitle?: string; // セットで添付する重要事項説明書
};

export type DocSet = {
  key: string;
  label: string;
  description: string;
  items: DocSetItem[];
};

export const DOC_SETS: DocSet[] = [
  {
    key: "nyukyo",
    label: "入居セット",
    description: "賃貸借契約書（重説付き）・鍵受渡書・生活リスク同意書",
    items: [
      {
        templateTitle: "賃貸借契約書",
        explanationTitle: "重要事項説明書（賃貸借）",
      },
      { templateTitle: "鍵受渡書（鍵受取証）" },
      { templateTitle: "生活におけるリスクについての同意書" },
    ],
  },
  {
    key: "kaigo",
    label: "訪問介護セット",
    description: "指定訪問介護契約書（重説付き）・個人情報使用同意書",
    items: [
      {
        templateTitle: "指定訪問介護　契約書",
        explanationTitle: "重要事項説明書（訪問介護・料金表付き）",
      },
      { templateTitle: "個人情報使用同意書" },
    ],
  },
  {
    key: "shogai",
    label: "障害福祉セット",
    description: "障がい福祉サービス契約書（重説付き）・個人情報使用同意書",
    items: [
      {
        templateTitle: "障がい福祉サービス（居宅介護等）契約書",
        explanationTitle: "重要事項説明書（障害・居宅介護）",
      },
      { templateTitle: "個人情報使用同意書" },
    ],
  },
  {
    key: "caremgmt",
    label: "ケアマネセット",
    description: "居宅介護支援契約書（重説付き）・個人情報使用同意書",
    items: [
      {
        templateTitle: "居宅介護支援（ケアマネジメント）契約書",
        explanationTitle: "重要事項説明書（居宅介護支援）",
      },
      { templateTitle: "個人情報使用同意書" },
    ],
  },
];

export function getDocSet(key: string): DocSet | undefined {
  return DOC_SETS.find((s) => s.key === key);
}
