// 署名依頼メールの送信（Resend の HTTP API を利用）。
// RESEND_API_KEY 未設定時は送信せず skipped を返す（URLコピー運用にフォールバック）。

export type SendResult = { ok: boolean; error?: string; skipped?: boolean };

const SENDER_NAME = "Dケア電子契約システム";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSignRequestEmail(params: {
  to: string;
  signerName: string;
  contractTitle: string;
  signUrl: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };

  // 送信元。独自ドメイン認証後は MAIL_FROM に設定する。
  // 未設定時は Resend のテスト用送信元を使用（自分宛のみ届く）。
  const from =
    process.env.MAIL_FROM ?? `${SENDER_NAME} <onboarding@resend.dev>`;

  const name = escapeHtml(params.signerName);
  const title = escapeHtml(params.contractTitle);
  const url = params.signUrl;

  const subject = `【電子契約】「${params.contractTitle}」へのご署名のお願い`;

  const text =
    `${params.signerName} 様\n\n` +
    `平素より大変お世話になっております。\n` +
    `「${params.contractTitle}」につきまして、電子契約でのご署名をお願いいたします。\n\n` +
    `下記URLを開き、内容をご確認のうえ、画面の案内に従ってご署名ください。\n` +
    `スマートフォンでは指でサインいただけます。\n\n` +
    `${url}\n\n` +
    `※本メールにお心当たりのない場合は破棄してください。\n` +
    `※本リンクはご本人専用です。第三者への転送はお控えください。\n\n` +
    `${SENDER_NAME}`;

  const html = `
  <div style="font-family:sans-serif;line-height:1.8;color:#1f2933;max-width:560px">
    <p>${name} 様</p>
    <p>平素より大変お世話になっております。<br>
    「${title}」につきまして、電子契約でのご署名をお願いいたします。</p>
    <p>下記ボタンを開き、内容をご確認のうえ、画面の案内に従ってご署名ください。<br>
    スマートフォンでは指でサインいただけます。</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block">契約内容を確認して署名する</a>
    </p>
    <p style="font-size:12px;color:#6b7785">ボタンが開けない場合は次のURLをブラウザに貼り付けてください：<br>
    <a href="${url}">${escapeHtml(url)}</a></p>
    <hr style="border:none;border-top:1px solid #e2e6ea;margin:20px 0">
    <p style="font-size:12px;color:#6b7785">
      ※本メールにお心当たりのない場合は破棄してください。<br>
      ※本リンクはご本人専用です。第三者への転送はお控えください。<br>
      ${SENDER_NAME}
    </p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [params.to], subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// 締結完了後、契約PDFを控えとして送付する（署名者・担当者向け）
export async function sendCompletedCopyEmail(params: {
  to: string;
  recipientName: string;
  contractTitle: string;
  attachment: { filename: string; base64: string };
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };
  const from =
    process.env.MAIL_FROM ?? `${SENDER_NAME} <onboarding@resend.dev>`;

  const name = escapeHtml(params.recipientName);
  const title = escapeHtml(params.contractTitle);
  const subject = `【電子契約】「${params.contractTitle}」締結完了のお知らせ（控え）`;

  const text =
    `${params.recipientName} 様\n\n` +
    `「${params.contractTitle}」の電子契約が締結されました。\n` +
    `本メールに締結済みの契約書PDF（控え）を添付いたします。大切に保管してください。\n\n` +
    `${SENDER_NAME}`;

  const html = `
  <div style="font-family:sans-serif;line-height:1.8;color:#1f2933;max-width:560px">
    <p>${name} 様</p>
    <p>「${title}」の電子契約が締結されました。<br>
    本メールに締結済みの契約書PDF（控え）を添付いたします。大切に保管してください。</p>
    <hr style="border:none;border-top:1px solid #e2e6ea;margin:20px 0">
    <p style="font-size:12px;color:#6b7785">${SENDER_NAME}</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        html,
        text,
        attachments: [
          { filename: params.attachment.filename, content: params.attachment.base64 },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
