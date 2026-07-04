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
    "NotoSansJP-Regular.ttf"
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
  // 重要事項説明書（任意）。あれば契約本文の前に別セクションで出力
  explanationTitle?: string | null;
  explanationBody?: string | null;
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
  // 日本語フォントは subset:false で全体を埋め込む。
  // pdf-lib のサブセット処理は日本語(glyf/CFF)で壊れたフォントを生成し、
  // ビューアで文字が表示されない不具合があるため、サブセットしない。
  const font = await doc.embedFont(loadFontBytes(), { subset: false });

  // A4印刷を想定した余白・文字サイズ（本文10.5pt・行送り1.55）
  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 52;
  const bottomLimit = margin + 18; // ページ番号の領域を確保
  const maxWidth = pageSize[0] - margin * 2;
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);

  let page: PDFPage = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => {
    page = doc.addPage(pageSize);
    y = pageSize[1] - margin;
  };

  // 見出し直後の改ページ（見出しだけがページ末尾に残る）を防ぐ
  const ensure = (space: number) => {
    if (y - space < bottomLimit) newPage();
  };

  const draw = (
    text: string,
    size: number,
    opts: {
      color?: ReturnType<typeof rgb>;
      gap?: number;
      align?: "left" | "center";
      leading?: number;
    } = {}
  ) => {
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size * (opts.leading ?? 1.55);
    for (const line of lines) {
      if (y - lineHeight < bottomLimit) newPage();
      const w = font.widthOfTextAtSize(line, size);
      const x =
        opts.align === "center" ? margin + (maxWidth - w) / 2 : margin;
      page.drawText(line, {
        x,
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
    if (y - 12 < bottomLimit) newPage();
    y -= 6;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize[0] - margin, y },
      thickness: 0.5,
      color: gray,
    });
    y -= 12;
  };

  // 重要事項説明書（あれば契約本文の前に別ページで出力）
  if (input.explanationBody) {
    draw(input.explanationTitle ?? "重要事項説明書", 14, {
      align: "center",
      gap: 6,
    });
    hr();
    draw(input.explanationBody, 10.5, { gap: 14 });
    newPage();
  }

  // タイトル（紙の契約書と同様に中央寄せ）
  draw(input.title, 16, { align: "center", gap: 2 });
  draw(`契約種別: ${input.categoryLabel}`, 9.5, {
    color: gray,
    align: "center",
    gap: 6,
  });
  hr();

  // 本文
  draw(input.body, 10.5, { gap: 14 });

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
    const targetW = 180;
    const scale = targetW / img.width;
    const w = targetW;
    const h = img.height * scale;
    if (y - h < bottomLimit) newPage();
    page.drawImage(img, { x: margin + 12, y: y - h, width: w, height: h });
    y -= h + 6;
  };

  // 署名欄（見出しと最初の署名者が離れないよう領域を確保）
  ensure(140);
  hr();
  draw("■ 電子署名の記録", 12, { gap: 6 });
  input.signers.forEach((s, i) => {
    const signed = s.status === "SIGNED";
    ensure(signed ? 130 : 50);
    draw(s.email ? `署名者: ${s.name}（${s.email}）` : `署名者: ${s.name}`, 10.5, {
      gap: 2,
    });
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
  ensure(90);
  hr();
  draw(
    `この文書はDケア電子契約システムにより生成されました。`,
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

  // 全ページ下部中央にページ番号を付す（印刷時の照合用）
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${pages.length}`;
    const w = font.widthOfTextAtSize(label, 9);
    p.drawText(label, {
      x: (pageSize[0] - w) / 2,
      y: 28,
      size: 9,
      font,
      color: gray,
    });
  });

  return doc.save();
}
