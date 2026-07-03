"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

type NavUser = { name: string; role: string };

const LINKS = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/contracts", label: "契約" },
  { href: "/clients", label: "相手先" },
  { href: "/templates", label: "テンプレート" },
];

export function TopNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <Link href="/dashboard" className="brand">
          Dケア電子契約システム
        </Link>
        <nav className="nav">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : undefined}
            >
              {l.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/users"
              className={isActive("/users") ? "active" : undefined}
            >
              ユーザー
            </Link>
          )}
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
