import { cookies } from "next/headers";
import crypto from "crypto";

// 共通パスワード（合言葉）方式の認証。
// 社員全員が同じパスコードでログインし、個別アカウントは持たない。
// パスコードは APP_PASSCODE（未設定時は SEED_ADMIN_PASSWORD）で設定する。

// 一時的に認証を無効化（パスワードフリー運用）。
// 共通パスワードを再度有効にする場合は false に戻すだけでよい。
export const AUTH_DISABLED = true;

const COOKIE_NAME = "ec_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  // SESSION_SECRET 未設定時は DATABASE_URL（環境固有の秘密値）から鍵を導出する。
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.length >= 16) {
    return crypto
      .createHash("sha256")
      .update("dcare-keiyaku-session-v1:" + dbUrl)
      .digest("hex");
  }
  throw new Error("SESSION_SECRET または DATABASE_URL を設定してください。");
}

// 共通パスコードを取得（未設定なら null = ログイン不可のfail-closed）
export function getPasscode(): string | null {
  return process.env.APP_PASSCODE || process.env.SEED_ADMIN_PASSWORD || null;
}

export function verifyPasscode(input: string): boolean {
  const passcode = getPasscode();
  if (!passcode) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(passcode).digest();
  return crypto.timingSafeEqual(a, b);
}

// base64url ヘルパ
function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(str: string): Buffer {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signToken(payload: object): string {
  const data = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest();
  return `${data}.${b64urlEncode(sig)}`;
}

function verifyToken(token: string): { exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = b64urlEncode(
    crypto.createHmac("sha256", getSecret()).update(data).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(data).toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ログイン成功時にセッションCookieを発行
export function createSession(): void {
  const token = signToken({ app: 1, exp: Date.now() + SESSION_TTL_MS });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

// ログイン済みか（共通パスコード入力済みか）
export function isAuthenticated(): boolean {
  if (AUTH_DISABLED) return true;
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token) !== null;
}

// 認証必須のサーバーアクション用ガード
export function requireAuth(): void {
  if (!isAuthenticated()) throw new Error("UNAUTHENTICATED");
}
