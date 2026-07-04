import { PDFDocument, rgb, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadFontBytes } from "./pdf";
import { BillingItem, totalOf, yen } from "./billing";

// 会社情報（見積書・請求書の発行元）
const COMPANY = {
  name: "株式会社dhpケアマネジメント",
  rep: "代表取締役 吉田 俊輔",
  address: "大阪府大阪市天王寺区味原町13-18 オーセント味原 302号室",
};

export type BillingPdfInput = {
  docType: "quote" | "invoice"; // 見積書 / 請求書
  customerName: string;
  roomNo: string;
  propertyName: string;
  issueDate: Date;
  dueDateIso: string; // お支払い期限（YYYY-MM-DD）
  bankInfo: string;
  items: BillingItem[];
};

function fmtJpDate(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

function fmtIsoToJp(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

export async function generateBillingPdf(
  input: BillingPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadFontBytes(), { subset: false });

  const pageW = 595.28;
  const pageH = 841.89; // A4
  const margin = 52;
  const right = pageW - margin;
  const page: PDFPage = doc.addPage([pageW, pageH]);

  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.65, 0.7, 0.76);

  const text = (
    t: string,
    x: number,
    y: number,
    size: number,
    opts: { color?: ReturnType<typeof rgb>; font?: PDFFont } = {}
  ) => {
    page.drawText(t, { x, y, size, font, color: opts.color ?? black });
  };
  const textRight = (t: string, xRight: number, y: number, size: number, color = black) => {
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: xRight - w, y, size, font, color });
  };
  const textCenter = (t: string, y: number, size: number) => {
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (pageW - w) / 2, y, size, font, color: black });
  };
  const hline = (y: number, x1 = margin, x2 = right, thickness = 0.6) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: line });
  };

  const title = input.docType === "invoice" ? "初期費用 御請求書" : "初期費用 御見積書";
  const total = totalOf(input.items);

  let y = pageH - margin;

  // 発行日（右上）・タイトル
  textRight(`発行日：${fmtJpDate(input.issueDate)}`, right, y - 9, 9.5, gray);
  y -= 30;
  textCenter(title, y, 18);
  y -= 10;
  hline(y, margin + 130, right - 130, 1);
  y -= 34;

  // 宛名（左）と発行元（右）
  text(`${input.customerName} 様`, margin, y, 14);
  const roomLabel = input.roomNo ? `${input.propertyName}　${input.roomNo}号室` : input.propertyName;
  text(roomLabel, margin, y - 20, 10.5, { color: gray });

  textRight(COMPANY.name, right, y, 10.5);
  textRight(COMPANY.rep, right, y - 15, 9.5, gray);
  textRight(COMPANY.address, right, y - 29, 8.5, gray);
  y -= 52;

  text(
    input.docType === "invoice"
      ? "下記の通りご請求申し上げます。"
      : "下記の通りお見積り申し上げます。",
    margin,
    y,
    10.5
  );
  y -= 30;

  // 合計金額と支払期限の帯
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: right - margin,
    height: 34,
    color: rgb(0.95, 0.96, 0.985),
  });
  text(
    input.docType === "invoice" ? "ご請求金額（税込）" : "お見積金額（税込）",
    margin + 12,
    y - 3,
    11
  );
  textRight(yen(total), margin + 290, y - 5, 16);
  text("お支払い期限：", margin + 322, y - 3, 10.5);
  textRight(fmtIsoToJp(input.dueDateIso), right - 12, y - 3, 11);
  y -= 44;

  // 明細テーブル
  const colName = margin;
  const colUnitR = margin + 260; // 単価 右端
  const colQtyR = margin + 295; // 数量 右端
  const colSubR = margin + 370; // 小計 右端
  const colNote = margin + 382;

  text("内　容", colName, y, 10, { color: gray });
  textRight("単　価", colUnitR, y, 10, gray);
  textRight("数量", colQtyR, y, 10, gray);
  textRight("小　計", colSubR, y, 10, gray);
  text("備　考", colNote, y, 10, { color: gray });
  y -= 8;
  hline(y);
  y -= 20;

  for (const item of input.items) {
    text(item.name, colName, y, 10.5);
    textRight(yen(item.unitPrice), colUnitR, y, 10.5);
    textRight(String(item.qty), colQtyR, y, 10.5);
    textRight(yen(item.unitPrice * item.qty), colSubR, y, 10.5);
    if (item.note) text(item.note, colNote, y, 8, { color: gray });
    y -= 10;
    hline(y, margin, right, 0.35);
    y -= 18;
  }

  // 合計
  y -= 2;
  text("ご請求額合計（税込）", colName + 160, y, 11);
  textRight(yen(total), colSubR, y, 12.5);
  y -= 10;
  hline(y, colName + 160, colSubR, 1);
  y -= 22;

  text("※家賃、共益費、管理費は消費税非課税", margin, y, 8.5, { color: gray });
  y -= 34;

  // 振込先
  text("【振込先】", margin, y, 10.5);
  y -= 18;
  text(input.bankInfo, margin + 8, y, 10.5);
  y -= 16;
  text(`口座名義：${COMPANY.name}`, margin + 8, y, 10.5);
  y -= 26;
  text("お支払につきましては上記口座へお願いいたします。", margin, y, 9, {
    color: gray,
  });
  y -= 14;
  text(
    "振込手数料につきましてはお客様ご負担にてお願い申し上げます。",
    margin,
    y,
    9,
    { color: gray }
  );

  return doc.save();
}
