import Link from "next/link";
import { prisma } from "@/lib/db";
import { ContractStatusBadge } from "@/components/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/template";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [total, draft, sent, signed, recent] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: "DRAFT" } }),
    prisma.contract.count({ where: { status: { in: ["SENT", "VIEWED"] } } }),
    prisma.contract.count({ where: { status: "SIGNED" } }),
    prisma.contract.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { signers: true },
    }),
  ]);

  const cards = [
    { label: "契約 合計", value: total },
    { label: "下書き", value: draft },
    { label: "署名待ち", value: sent },
    { label: "締結済み", value: signed },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>ダッシュボード</h1>
        <Link href="/contracts/new" className="btn">
          ＋ 新規契約を作成
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "18px 0",
        }}
      >
        {cards.map((c) => (
          <div className="panel" key={c.label} style={{ textAlign: "center", margin: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
            <div className="muted">{c.label}</div>
          </div>
        ))}
      </div>

      <h2>最近の契約</h2>
      <div className="panel" style={{ padding: 0 }}>
        {recent.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            まだ契約がありません。「新規契約を作成」から始めてください。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>種別</th>
                <th>署名者</th>
                <th>状態</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contracts/${c.id}`}>{c.title}</Link>
                  </td>
                  <td>{CATEGORY_LABELS[c.category] ?? c.category}</td>
                  <td>{c.signers.map((s) => s.name).join("、") || "—"}</td>
                  <td>
                    <ContractStatusBadge status={c.status} />
                  </td>
                  <td className="muted">
                    {new Intl.DateTimeFormat("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(c.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
