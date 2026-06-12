import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function TopNav({ user }: { user: SessionUser }) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <Link href="/dashboard" className="brand">
          Dケア電子契約システム
        </Link>
        <nav className="nav">
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/contracts">契約</Link>
          <Link href="/clients">相手先</Link>
          <Link href="/templates">テンプレート</Link>
          {user.role === "ADMIN" && <Link href="/users">ユーザー</Link>}
        </nav>
        <div className="user">
          <span>
            {user.name}（{user.role === "ADMIN" ? "管理者" : "職員"}）
          </span>
          <form action={logoutAction}>
            <button className="btn secondary" style={{ padding: "5px 12px" }}>
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
