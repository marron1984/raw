import fs from "fs";
import path from "path";
import { PDFDocument, rgb, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

let cachedFontBytes: Uint8Array | null = null;

function loadFontBytes(): Uint8Array {
  if (cachedFontBytes) return cachedFontBytes;
  const fontPath = path.join(
    process.cwd(),
    "src",
    "assets",
    "fonts",
    "NotoSansJP-Regular.otf"
  );
  cachedFontBytes = new Uint8Array(fs.readFileSync(fontPath));
  return cachedFontBytes;
}

export type SignerSummary = {
  name: string;
  email: string;
  status: string;
  signedAt: Date | null;
  typedName: string | null;
  ipAddress: string | null;
  // 手書き署名画像（PNGのdata URL）
  signatureImage: string | null;
};

export type ContractPdfInput = {
  title: string;
  categoryLabel: string;
  body: string;
  signers: SignerSummary[];
  contractId: string;
  createdAt: Date;
  completedAt: Date | null;
};

// 日本語は単語区切りが無いため、幅を見ながら1文字ずつ折り返す
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine === "") {
      lines.push("");
      continue;
    }
    let current = "";
    for (const ch of rawLine) {
      const test = current + ch;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current !== "") {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current !== "") lines.push(current);
  }
  return lines;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export async function generateContractPdf(
  input: ContractPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadFontBytes(), { subset: true });

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 56;
  const maxWidth = pageSize[0] - margin * 2;
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);

  let page: PDFPage = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => {
    page = doc.addPage(pageSize);
    y = pageSize[1] - margin;
  };

  const draw = (
    text: string,
    size: number,
    opts: { color?: ReturnType<typeof rgb>; gap?: number } = {}
  ) => {
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size * 1.6;
    for (const line of lines) {
      if (y - lineHeight < margin) newPage();
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font,
        color: opts.color ?? black,
      });
      y -= lineHeight;
    }
    y -= opts.gap ?? 0;
  };

  const hr = () => {
    if (y - 12 < margin) newPage();
    y -= 6;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize[0] - margin, y },
      thickness: 0.5,
      color: gray,
    });
    y -= 12;
  };

  // タイトル
  draw(input.title, 18, { gap: 4 });
  draw(`契約種別: ${input.categoryLabel}`, 10, { color: gray, gap: 8 });
  hr();

  // 本文
  draw(input.body, 11, { gap: 16 });

  // 手書き署名画像を先に埋め込む（描画処理は同期のため事前に解決しておく）
  const signatureImgs = await Promise.all(
    input.signers.map(async (s) => {
      if (
        s.signatureImage &&
        s.signatureImage.startsWith("data:image/png;base64,")
      ) {
        try {
          const b64 = s.signatureImage.split(",")[1];
          return await doc.embedPng(Buffer.from(b64, "base64"));
        } catch {
          return null;
        }
      }
      return null;
    })
  );

  // キャンバスから取得した署名画像を、幅を一定に保って配置する
  const drawSignature = (img: NonNullable<(typeof signatureImgs)[number]>) => {
    const targetW = 200;
    const scale = targetW / img.width;
    const w = targetW;
    const h = img.height * scale;
    if (y - h < margin) newPage();
    page.drawImage(img, { x: margin + 12, y: y - h, width: w, height: h });
    y -= h + 6;
  };

  // 署名欄
  hr();
  draw("■ 電子署名の記録", 13, { gap: 6 });
  input.signers.forEach((s, i) => {
    const signed = s.status === "SIGNED";
    draw(`署名者: ${s.name}（${s.email}）`, 11, { gap: 2 });
    draw(
      `  状態: ${signed ? "同意・署名済み" : s.status}` +
        `   署名日時: ${fmtDate(s.signedAt)}`,
      10,
      { color: gray, gap: 4 }
    );
    if (signed) {
      const img = signatureImgs[i];
      if (img) {
        draw("  署名:", 10, { color: gray, gap: 2 });
        drawSignature(img);
      }
      draw(`  IPアドレス: ${s.ipAddress ?? "—"}`, 10, { color: gray, gap: 8 });
    } else {
      y -= 4;
    }
  });

  // フッター（証跡情報）
  hr();
  draw(
    `この文書は電子契約システムにより生成されました。`,
    9,
    { color: gray, gap: 2 }
  );
  draw(`契約ID: ${input.contractId}`, 9, { color: gray, gap: 2 });
  draw(
    `作成日時: ${fmtDate(input.createdAt)}　締結完了日時: ${fmtDate(
      input.completedAt
    )}`,
    9,
    { color: gray, gap: 2 }
  );
  draw(`PDF生成日時: ${fmtDate(new Date())}`, 9, { color: gray });

  return doc.save();
}
