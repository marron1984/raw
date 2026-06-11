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
- `src/assets/fonts/NotoSansJP-Regular.ttf`（glyf形式TTF）を **subset:false（全体埋め込み）** で使用
- OTF(CFF)やsubset:trueに変えてはいけない（pdf-libの不具合で日本語が表示されなくなる）

### 4. セキュリティ（fail-closed）
- 認証情報の既定値をソースコードに書かない
- `SEED_ADMIN_PASSWORD` 未設定時は管理者を作成しない
- `SESSION_SECRET` 未設定時は `DATABASE_URL` から鍵を導出（共有既定値は禁止）
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
| `DATABASE_URL` | ✅ | Supabase Session pooler の接続文字列（`?sslmode=require` 付き） |
| `SEED_ADMIN_PASSWORD` | ✅ | 初期管理者のログインパスワード |
| `SESSION_SECRET` | 推奨 | セッション署名鍵（未設定時はDATABASE_URLから導出） |
| `APP_URL` | 任意 | 署名URL生成用（未設定時はVercel本番ドメイン） |

## 画面構成
- `/login` … 社内ログイン
- `/dashboard` `/contracts` `/templates` `/users` … 認証必須（(app)グループ）
- `/sign/[token]` … 契約相手向けの公開署名ページ（手書きサイン・スマホ対応）
- `/api/contracts/[id]/pdf` … 締結PDF生成（要ログイン）

## UI方針
- 日本語UI・スマホ対応必須（700px以下のメディアクエリが globals.css にある）
- フォーム入力は16px以上（iOSの自動ズーム防止）
