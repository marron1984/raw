import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "ec_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12時間

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  // SESSION_SECRET が未設定でも動くよう既定値を使用する。
  // セキュリティ強化のため、本番では SESSION_SECRET の設定を推奨。
  return "denshi-keiyaku-default-session-secret-please-override-in-env";
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

// HMAC 署名付きトークンを生成（payload.signature 形式）
function signToken(payload: object): string {
  const json = JSON.stringify(payload);
  const data = b64urlEncode(Buffer.from(json, "utf8"));
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest();
  return `${data}.${b64urlEncode(sig)}`;
}

function verifyToken(token: string): { userId: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = b64urlEncode(
    crypto.createHmac("sha256", getSecret()).update(data).digest()
  );
  // タイミング攻撃に強い比較
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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ログイン：資格情報を検証してセッションCookieを発行
export async function createSession(userId: string): Promise<void> {
  const token = signToken({ userId, exp: Date.now() + SESSION_TTL_MS });
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

// 現在のログインユーザーを取得（未ログインなら null）
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// 認証必須。未ログインなら例外（呼び出し側でログインへリダイレクト）
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
