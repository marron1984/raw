# Dケア電子契約システム 開発ガイド

入居者との賃貸借契約・訪問介護の利用契約を電子締結するための社内システム。

## 技術構成
- Next.js 14 (App Router) / TypeScript / Prisma / PostgreSQL (Supabase)
- 本番: Vercel（ブランチ `claude/electronic-contract-system-r29tl4` へのpushで自動デプロイ）
- PDF生成: pdf-lib + 同梱の日本語TTFフォント

## 重要な設計原則（変更時に必ず守ること）

### 1. ビルドはDBに接続しない
- `vercel-build` は `prisma generate && next build` のみ。DB接続・seedは行わない
- テーブル作成・初期データ投入は **初回アクセス時の自動bootstrap**（`src/lib/bootstrap.ts`）で行う
- DBに触れるページには必ず `export const dynamic = "force-dynamic"` を付ける
  （ビルド時の事前生成でDBに触れるとデプロイが失敗する）

### 2. Prismaスキーマを変更したら
- `prisma/schema.prisma` 変更後、DDLを再生成して `src/lib/bootstrap-sql.ts` に反映する:
  `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- 既存テーブルへのカラム追加は bootstrap では適用されない（新規DB作成時のみ）。
  既存DBへの変更はマイグレーション方針を別途検討すること

### 3. PDFの日本語フォント
- `src/assets/fonts/NotoSansJP-Regular.ttf`（glyf形式TTF・**GSUBテーブル除去済み**）を **subset:false（全体埋め込み）** で使用
- OTF(CFF)やsubset:trueに変えてはいけない（pdf-libの不具合で日本語が表示されなくなる）
- GSUB入りの元フォントに戻してもいけない（fontkitがLatin文字で始まる行の数字を
  全角幅で描画し文字間が異常に空く。除去は fontTools で `del font["GSUB"]` → save）

### 4. セキュリティ（fail-closed）
- 認証は共通パスワード方式（`APP_PASSCODE`）。個別アカウントは廃止済み
- パスコード未設定時はログイン不可（fail-closed）。既定値をコードに書かない
- `SESSION_SECRET` 未設定時は `DATABASE_URL` から鍵を導出（共有既定値は禁止）
- 契約には担当者マスタ（Staff）から選んだ担当者名/メールを記録する
- `.env` はコミット禁止（`.env.example` のみ更新可）

### 5. テンプレートの同期
- 標準契約書テンプレートは `src/lib/seed-core.ts` の `syncCoreData()` で管理
- タイトル一致でupsertされる。タイトルを変えた場合は旧タイトルの無効化処理を追加すること

## 検証コマンド
```bash
npx tsc --noEmit      # 型チェック（CIと同じ）
npm run build         # 本番ビルド（CIと同じ。DB不要で通ること）
```

## 環境変数（Vercel）
| 変数 | 必須 | 説明 |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase **Transaction pooler**（ポート6543）を推奨。末尾に `?pgbouncer=true&connection_limit=1` を付ける（サーバーレスでの接続枯渇・不安定を防ぐ）。Session pooler(5432)はサーバーレスで接続が枯渇しやすい |
| `APP_PASSCODE` | ✅ | 共通パスワード（全社員同一。未設定時は SEED_ADMIN_PASSWORD を使用） |
| `MAINTENANCE_KEY` | 任意 | 契約一括リセットAPIの有効化キー（通常は未設定） |
| `SESSION_SECRET` | 推奨 | セッション署名鍵（未設定時はDATABASE_URLから導出） |
| `APP_URL` | 任意 | 署名URL生成用（未設定時はVercel本番ドメイン） |
| `RESEND_API_KEY` | 任意 | 署名依頼メール送信（Resend）。未設定時はメール送信せずURL案内のみ |
| `MAIL_FROM` | 任意 | メール送信元（例 `名前 <addr@example.com>`）。未設定時はResendテスト送信元 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | 任意 | 締結PDFのGoogleドライブ保存用サービスアカウント鍵JSON（全文） |
| `GDRIVE_FOLDER_ID` | 任意 | 保存先フォルダID（共有ドライブ内。SAをメンバーに追加） |

## メール送信
- 署名依頼メールは `src/lib/email.ts`（Resend HTTP API）で送信。`fetch` のみで依存追加なし
- `RESEND_API_KEY` 未設定なら送信せず `skipped` を返し、従来のURLコピー運用にフォールバック（fail-graceful）

## Googleドライブ保存
- 締結時（全署名完了時）に `src/lib/drive-save.ts` が締結PDFを共有ドライブへ自動保存
- 認証はサービスアカウントのJWT（`src/lib/gdrive.ts`、`fetch`+`crypto`のみ・依存追加なし）
- 共有ドライブ前提（SAはマイドライブに容量を持たないため）。`supportsAllDrives=true`で送信
- 未設定なら `skipped`、失敗しても署名処理は継続（fail-graceful・監査ログに記録）
- `Contract.driveFileId` / `driveSavedAt` に保存結果を記録。既存DBへは bootstrap の ADD COLUMN IF NOT EXISTS で対応

## 画面構成
- `/login` … 社内ログイン
- `/dashboard` `/contracts` `/templates` `/users` … 認証必須（(app)グループ）
- `/sign/[token]` … 契約相手向けの公開署名ページ（手書きサイン・スマホ対応）
- `/api/contracts/[id]/pdf` … 締結PDF生成（要ログイン）

## UI方針
- 日本語UI・スマホ対応必須（700px以下のメディアクエリが globals.css にある）
- フォーム入力は16px以上（iOSの自動ズーム防止）
