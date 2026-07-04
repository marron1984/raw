import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthenticated()) redirect("/login");

  // 初回アクセス時にDBを自動セットアップ（失敗時はログイン画面で案内）
  try {
    await ensureBootstrap();
  } catch (e) {
    console.error("app layout: db error:", e);
    redirect("/login");
  }

  return (
    <>
      <TopNav />
      <main className="container">{children}</main>
    </>
  );
}
