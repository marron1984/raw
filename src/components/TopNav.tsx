"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/contracts", label: "契約" },
  { href: "/clients", label: "相手先" },
  { href: "/staff", label: "担当者" },
  { href: "/locations", label: "拠点" },
  { href: "/templates", label: "テンプレート" },
];

export function TopNav() {
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
        </nav>
        {/* 認証無効化中のためログアウトボタンは非表示（再有効化時に戻す） */}
      </div>
    </div>
  );
}
