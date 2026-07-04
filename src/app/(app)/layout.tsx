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

  // 初回アクセス時にDBを自動セットアップ。
  // 失敗時はリダイレクトせず、原因が分かるエラー画面を表示する
  let dbError = false;
  try {
    await ensureBootstrap();
  } catch (e) {
    console.error("app layout: db error:", e);
    dbError = true;
  }

  if (dbError) {
    return (
      <>
        <TopNav />
        <main className="container">
          <div className="alert error">
            データベースに接続できません。
            <br />
            ・Supabase（無料プラン）は一定期間使わないとプロジェクトが自動的に一時停止します。Supabaseのダッシュボードを開き、プロジェクトを「Restore /
            再開」してから、このページを再読み込みしてください。
            <br />
            ・再開しても直らない場合は、Vercel の環境変数 DATABASE_URL
            の設定を確認してください。
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <main className="container">{children}</main>
    </>
  );
}
