import Link from "next/link";
import { prisma } from "@/lib/db";
import { ContractStatusBadge } from "@/components/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/template";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { signers: true },
  });

  return (
    <>
      <div className="page-head">
        <h1>契約一覧</h1>
        <Link href="/contracts/new" className="btn">
          ＋ 新規契約を作成
        </Link>
      </div>

      <div className="panel" style={{ padding: 0, marginTop: 16 }}>
        {contracts.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            契約がありません。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>種別</th>
                <th>署名者</th>
                <th>署名状況</th>
                <th>状態</th>
                <th>作成日</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const signed = c.signers.filter((s) => s.status === "SIGNED").length;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/contracts/${c.id}`}>{c.title}</Link>
                    </td>
                    <td>{CATEGORY_LABELS[c.category] ?? c.category}</td>
                    <td>{c.signers.map((s) => s.name).join("、") || "—"}</td>
                    <td>
                      {signed}/{c.signers.length} 名
                    </td>
                    <td>
                      <ContractStatusBadge status={c.status} />
                    </td>
                    <td className="muted">
                      {new Intl.DateTimeFormat("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(c.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
