import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toggleUserActiveAction } from "@/app/actions/users";
import { UserForm } from "./UserForm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN") {
    return (
      <div className="alert error">このページには管理者のみアクセスできます。</div>
    );
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <h1>ユーザー管理</h1>
      <p className="muted">社内スタッフのアカウントと権限を管理します。</p>

      <h2>新規ユーザー登録</h2>
      <div className="panel">
        <UserForm />
      </div>

      <h2>ユーザー一覧</h2>
      <div className="panel" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>メールアドレス</th>
              <th>権限</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const toggle = toggleUserActiveAction.bind(null, u.id);
              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role === "ADMIN" ? "管理者" : "職員"}</td>
                  <td>
                    {u.isActive ? (
                      <span className="badge green">有効</span>
                    ) : (
                      <span className="badge gray">無効</span>
                    )}
                  </td>
                  <td>
                    {u.id === me.id ? (
                      <span className="muted">（自分）</span>
                    ) : (
                      <form action={toggle}>
                        <button className="btn secondary" style={{ padding: "4px 10px" }}>
                          {u.isActive ? "無効化" : "有効化"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
