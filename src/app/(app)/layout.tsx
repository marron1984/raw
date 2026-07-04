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
  let dbError: string | null = null;
  try {
    await ensureBootstrap();
  } catch (e) {
    console.error("app layout: db error:", e);
    dbError = e instanceof Error ? e.message : String(e);
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
          <details className="panel" style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              エラーの詳細（サポート用）
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                marginTop: 10,
                color: "var(--muted)",
              }}
            >
              {dbError}
            </pre>
          </details>
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
