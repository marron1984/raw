import { prisma } from "@/lib/db";
import { BillingForm } from "./BillingForm";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
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

  return (
    <>
      <h1>見積書・請求書の発行</h1>
      <p className="muted">
        入居日を選ぶと日割り家賃を自動計算し、初期費用（日割り家賃・翌月分家賃・火災保険料・礼金）の見積書／請求書PDFを発行します。
      </p>
      <div style={{ marginTop: 16 }}>
        <BillingForm locations={locations} />
      </div>
    </>
  );
}
