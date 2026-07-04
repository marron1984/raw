import Link from "next/link";
import { prisma } from "@/lib/db";

import { ensureBootstrap } from "@/lib/bootstrap";
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  await ensureBootstrap();
  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <div className="page-head">
        <h1>拠点マスタ</h1>
        <Link href="/locations/new" className="btn">
          ＋ 拠点を登録
        </Link>
      </div>
      <p className="muted">
        物件・事業所ごとの差し込み初期値（住所・金額・口座など）を管理します。契約作成時に拠点を選ぶと自動入力されます。
      </p>

      <div className="panel" style={{ padding: 0, marginTop: 12 }}>
        {locations.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            拠点がまだ登録されていません。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>拠点名</th>
                <th>メモ</th>
                <th>登録済み初期値</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => {
                let count = 0;
                try {
                  count = Object.keys(JSON.parse(l.fieldsJson)).length;
                } catch {}
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/locations/${l.id}`}>{l.name}</Link>
                    </td>
                    <td className="muted">{l.note ?? "—"}</td>
                    <td className="muted">{count} 項目</td>
                    <td>
                      <Link href={`/locations/${l.id}`}>編集</Link>
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
