import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { buildInitialCostItems, parseAmount } from "@/lib/billing";
import { generateBillingPdf } from "@/lib/billing-pdf";

export const dynamic = "force-dynamic";

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) {
    return NextResponse.json({ error: "入居日を選択してください" }, { status: 400 });
  }

  const items = buildInitialCostItems({
    moveInIso: moveIn,
    rent: parseAmount(q.get("rent")),
    fireInsurance: parseAmount(q.get("fire")),
    reikin: parseAmount(q.get("reikin")),
  });
  if (items.length === 0) {
    return NextResponse.json({ error: "金額を入力してください" }, { status: 400 });
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
