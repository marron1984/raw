import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { toggleStaffActiveAction } from "@/app/actions/staff";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await ensureBootstrap();
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <div className="page-head">
        <h1>担当者管理</h1>
        <Link href="/staff/new" className="btn">
          ＋ 担当者を登録
        </Link>
      </div>
      <p className="muted">
        契約の担当スタッフを管理します。契約作成時に担当者を選択でき、締結時の控えメールも担当者に届きます。
      </p>

      <div className="panel" style={{ padding: 0, marginTop: 12 }}>
        {staff.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            担当者がまだ登録されていません。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メールアドレス</th>
                <th>連絡先</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const toggle = toggleStaffActiveAction.bind(null, s.id);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/staff/${s.id}`}>{s.name}</Link>
                    </td>
                    <td className="muted">{s.email ?? "—"}</td>
                    <td className="muted">{s.phone ?? "—"}</td>
                    <td>
                      {s.isActive ? (
                        <span className="badge green">有効</span>
                      ) : (
                        <span className="badge gray">無効</span>
                      )}
                    </td>
                    <td>
                      <form action={toggle} style={{ display: "inline" }}>
                        <button className="btn secondary" style={{ padding: "4px 10px" }}>
                          {s.isActive ? "無効化" : "有効化"}
                        </button>
                      </form>
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
