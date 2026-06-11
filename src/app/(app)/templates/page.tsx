import Link from "next/link";
import { prisma } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/template";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.contractTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { contracts: true } } },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>契約書テンプレート</h1>
        <Link href="/templates/new" className="btn">
          ＋ 新規テンプレート
        </Link>
      </div>
      <p className="muted">入居契約・訪問介護利用契約などのひな形を管理します。</p>

      <div className="panel" style={{ padding: 0, marginTop: 16 }}>
        {templates.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            テンプレートがありません。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>テンプレート名</th>
                <th>種別</th>
                <th>利用契約数</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/templates/${t.id}`}>{t.title}</Link>
                    {t.description && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td>{CATEGORY_LABELS[t.category] ?? t.category}</td>
                  <td>{t._count.contracts}</td>
                  <td>
                    {t.isActive ? (
                      <span className="badge green">有効</span>
                    ) : (
                      <span className="badge gray">無効</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/templates/${t.id}`}>編集</Link>
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
