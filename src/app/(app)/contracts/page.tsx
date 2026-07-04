import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { ContractStatusBadge } from "@/components/StatusBadge";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/template";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["DRAFT", "SENT", "VIEWED", "SIGNED", "DECLINED", "CANCELLED"];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  await ensureBootstrap();
  const q = (searchParams.q ?? "").trim();
  const status = (searchParams.status ?? "").trim();

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { signers: { some: { name: { contains: q, mode: "insensitive" } } } },
      { signers: { some: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (status && STATUS_OPTIONS.includes(status)) {
    where.status = status;
  }

  const contracts = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { signers: true },
  });

  return (
    <>
      <div className="page-head">
        <h1>契約一覧</h1>
        <div className="btn-row">
          <Link href="/contracts/new-set" className="btn secondary">
            📚 セットで一括作成
          </Link>
          <Link href="/contracts/new" className="btn">
            ＋ 新規契約を作成
          </Link>
        </div>
      </div>

      <form method="get" className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="タイトル・署名者名・メールで検索"
            style={{ flex: "1 1 240px" }}
          />
          <select name="status" defaultValue={status} style={{ flex: "0 0 150px" }}>
            <option value="">すべての状態</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <button className="btn">検索</button>
          {(q || status) && (
            <a className="btn secondary" href="/contracts">
              クリア
            </a>
          )}
        </div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        {contracts.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            {q || status ? "該当する契約がありません。" : "契約がありません。"}
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
