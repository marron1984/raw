import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { BillingItem, buildInitialCostItems, parseAmount } from "@/lib/billing";
import { generateBillingPdf } from "@/lib/billing-pdf";

export const dynamic = "force-dynamic";

// 画面で編集済みの明細（摘要・金額・数量）をJSONで受け取る。
function parseItems(raw: string | null): BillingItem[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    const items: BillingItem[] = [];
    for (const r of arr.slice(0, 50)) {
      const name = String(r?.name ?? "").trim();
      const unitPrice = Math.floor(Number(r?.unitPrice) || 0);
      const qty = Math.max(1, Math.floor(Number(r?.qty) || 1));
      const note = r?.note ? String(r.note).trim() : undefined;
      if (!name) continue;
      items.push({ name, unitPrice, qty, note });
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

// 初期費用の見積書・請求書PDFを発行する（社内利用者のみ）
export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const docType = q.get("type") === "invoice" ? "invoice" : "quote";
  const customerName = (q.get("name") ?? "").trim();
  const moveIn = q.get("moveIn") ?? "";
  const due = q.get("due") ?? "";

  if (!customerName) {
    return NextResponse.json({ error: "宛名を入力してください" }, { status: 400 });
  }

  // 画面で編集した明細を優先。無ければ入居日から自動計算（後方互換）
  let items = parseItems(q.get("items"));
  if (!items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) {
      return NextResponse.json({ error: "入居日を選択してください" }, { status: 400 });
    }
    items = buildInitialCostItems({
      moveInIso: moveIn,
      rent: parseAmount(q.get("rent")),
      fireInsurance: parseAmount(q.get("fire")),
      reikin: parseAmount(q.get("reikin")),
      waterFee: parseAmount(q.get("water")),
      utilities: parseAmount(q.get("utilities")),
    });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "明細がありません" }, { status: 400 });
  }

  const bytes = await generateBillingPdf({
    docType,
    customerName,
    roomNo: (q.get("room") ?? "").trim(),
    propertyName: (q.get("property") ?? "").trim(),
    issueDate: new Date(),
    dueDateIso: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : moveIn,
    bankInfo: (q.get("bank") ?? "").trim(),
    items,
  });

  const filename = docType === "invoice" ? "seikyusho.pdf" : "mitsumorisho.pdf";
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
