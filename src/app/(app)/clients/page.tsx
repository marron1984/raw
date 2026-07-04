import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLIENT_CATEGORY_LABELS: Record<string, string> = {
  RESIDENCE: "入居者",
  CARE: "訪問介護利用者",
  OTHER: "その他",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { kana: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
  });

  // 相手先ごとの契約件数（署名者の自動リンクから集計）
  const counts = await prisma.signer.groupBy({
    by: ["clientId"],
    where: { clientId: { not: null } },
    _count: { contractId: true },
  });
  const countMap = new Map(
    counts.map((c) => [c.clientId as string, c._count.contractId])
  );

  return (
    <>
      <div className="page-head">
        <h1>相手先マスタ</h1>
        <Link href="/clients/new" className="btn">
          ＋ 相手先を登録
        </Link>
      </div>
      <p className="muted">入居者・利用者などを登録しておくと、契約作成時に呼び出せます。</p>

      <form method="get" className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="氏名・フリガナ・メール・電話で検索"
            style={{ flex: "1 1 240px" }}
          />
          <button className="btn">検索</button>
          {q && (
            <a className="btn secondary" href="/clients">
              クリア
            </a>
          )}
        </div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        {clients.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            {q ? "該当する相手先がありません。" : "相手先がまだ登録されていません。"}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>氏名</th>
                <th>種別</th>
                <th>契約</th>
                <th>メール</th>
                <th>連絡先</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clients/${c.id}`}>{c.name}</Link>
                    {c.kana && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.kana}
                      </div>
                    )}
                  </td>
                  <td>{CLIENT_CATEGORY_LABELS[c.category] ?? c.category}</td>
                  <td>
                    {(countMap.get(c.id) ?? 0) > 0 ? (
                      <Link href={`/clients/${c.id}`}>
                        {countMap.get(c.id)}件
                      </Link>
                    ) : (
                      <span className="muted">0件</span>
                    )}
                  </td>
                  <td className="muted">{c.email ?? "—"}</td>
                  <td className="muted">{c.phone ?? "—"}</td>
                  <td>
                    <Link href={`/clients/${c.id}`}>詳細</Link>
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
