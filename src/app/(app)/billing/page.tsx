import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { BillingForm } from "./BillingForm";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await ensureBootstrap();
  const locationRows = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, fieldsJson: true },
  });

  const locations = locationRows.map((l) => {
    let fields: Record<string, string> = {};
    try {
      fields = JSON.parse(l.fieldsJson);
    } catch {}
    return { id: l.id, name: l.name, fields };
  });

  // 入居セット作成画面などから引き継がれた初期値（クエリパラメータ）
  const sp = (k: string): string | undefined => {
    const v = searchParams?.[k];
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const initial = {
    name: sp("name"),
    room: sp("room"),
    moveIn: sp("moveIn"),
    due: sp("due"),
    property: sp("property"),
    rent: sp("rent"),
    fire: sp("fire"),
    reikin: sp("reikin"),
    bank: sp("bank"),
  };
  const created = sp("created");

  return (
    <>
      <h1>見積書・請求書の発行</h1>
      {created && (
        <div className="alert success" style={{ marginTop: 12 }}>
          書類セット（{created}件・入居予定の部屋の重要事項説明書を含む）を作成しました。
          続けて初期費用の見積書・請求書を発行できます。{" "}
          <Link href={`/contracts${initial.name ? `?q=${encodeURIComponent(initial.name)}` : ""}`}>
            作成した書類を見る →
          </Link>
        </div>
      )}
      <p className="muted">
        入居日を選ぶと日割り家賃を自動計算し、初期費用（日割り家賃・翌月分家賃・火災保険料・礼金）の見積書／請求書PDFを発行します。
      </p>
      <div style={{ marginTop: 16 }}>
        <BillingForm locations={locations} initial={initial} />
      </div>
    </>
  );
}
