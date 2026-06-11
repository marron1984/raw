// アプリの公開URLを取得する。
// APP_URL 未設定時は Vercel の本番ドメインを自動利用し、
// それも無ければローカル開発用のURLにフォールバックする。
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function signUrlForToken(token: string): string {
  return `${getAppUrl()}/sign/${token}`;
}
