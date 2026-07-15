import crypto from "crypto";

// Googleドライブ（共有ドライブ）へPDFを保存する。
// サービスアカウントのJWT認証を使い、依存追加なし（fetch + crypto のみ）。
// 必要な環境変数:
//   GOOGLE_SERVICE_ACCOUNT_JSON … サービスアカウントの鍵JSON（全文）
//   GDRIVE_FOLDER_ID            … 保存先フォルダID（共有ドライブ内のフォルダ）

export type DriveResult =
  | { ok: true; fileId: string }
  | { ok: false; error: string; skipped?: boolean };

export function isDriveConfigured(): boolean {
  return (
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GDRIVE_FOLDER_ID
  );
}

type ServiceAccount = { client_email: string; private_key: string };

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const json = JSON.parse(raw);
    if (json.client_email && json.private_key) {
      return { client_email: json.client_email, private_key: json.private_key };
    }
  } catch {
    // ignore
  }
  return null;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// メモリ内アクセストークンキャッシュ（関数インスタンス単位）
let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/drive",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    sa.private_key
  );
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    exp: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function uploadPdfToDrive(params: {
  filename: string;
  bytes: Uint8Array;
}): Promise<DriveResult> {
  const sa = loadServiceAccount();
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!sa || !folderId) return { ok: false, error: "未設定", skipped: true };

  try {
    const token = await getAccessToken(sa);

    const boundary = "----dcaredrive" + crypto.randomBytes(8).toString("hex");
    const metadata = JSON.stringify({
      name: params.filename,
      parents: [folderId],
    });
    const head =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/pdf\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = Buffer.concat([
      Buffer.from(head, "utf8"),
      Buffer.from(params.bytes),
      Buffer.from(tail, "utf8"),
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) {
      return {
        ok: false,
        error: `${res.status}: ${(await res.text()).slice(0, 300)}`,
      };
    }
    const data = (await res.json()) as { id: string };
    return { ok: true, fileId: data.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
