"use client";

// ページ描画中の未捕捉エラー（DB停止など）を、素の "Application error" 画面の
// 代わりに日本語の案内画面で表示する。レイアウトのDBガードはページと並行して
// 動くため、ページ側のクエリ例外はここで受け止める必要がある。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container" style={{ maxWidth: 720, margin: "40px auto" }}>
      <div className="alert error">
        システムエラーが発生しました。データベースに接続できていない可能性があります。
        <br />
        ・Supabase（無料プラン）は一定期間使わないとプロジェクトが自動的に一時停止します。
        Supabaseのダッシュボードでプロジェクトを「Restore / 再開」し、1〜2分待ってから
        下の「再読み込み」を押してください。
        <br />
        ・直らない場合は、Vercel の環境変数 DATABASE_URL の設定を確認してください。
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => reset()}>
          再読み込み
        </button>
      </div>
      {error.digest && (
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          エラーコード: {error.digest}
        </p>
      )}
    </main>
  );
}
