"use client";

// ルートレイアウト自体が失敗した場合の最終フォールバック。
// ルートレイアウトごと置き換わるため html/body を自前で描画し、CSSに依存しない。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          fontFamily:
            '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif',
          background: "#f4f6fa",
          margin: 0,
          padding: "60px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            background: "#fdecec",
            border: "1px solid #f5b5b5",
            borderRadius: 10,
            padding: "20px 24px",
            color: "#8f1f1f",
            lineHeight: 1.9,
            fontSize: 14,
          }}
        >
          システムエラーが発生しました。データベースに接続できていない可能性があります。
          <br />
          ・Supabaseのダッシュボードでプロジェクトを「Restore / 再開」し、1〜2分待ってから再読み込みしてください。
          <br />
          ・直らない場合は、Vercel の環境変数 DATABASE_URL の設定を確認してください。
        </div>
        <div style={{ maxWidth: 680, margin: "16px auto 0" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "#2f6fed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 22px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
          {error.digest && (
            <p style={{ color: "#889", fontSize: 12, marginTop: 12 }}>
              エラーコード: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
