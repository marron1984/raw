import crypto from "crypto";

// 署名URL用の推測困難なトークンを生成
export function generateSignToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
