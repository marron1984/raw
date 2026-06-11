import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { markViewedAction } from "@/app/actions/sign";
import { CATEGORY_LABELS } from "@/lib/template";
import { SignForm } from "./SignForm";

export const dynamic = "force-dynamic";

export default async function SignPage({
  params,
}: {
  params: { token: string };
}) {
  // DB未接続でもクラッシュさせず、案内メッセージを表示する
  let signer;
  try {
    await ensureBootstrap();
    signer = await prisma.signer.findUnique({
      where: { token: params.token },
      include: { contract: true },
    });
  } catch (e) {
    console.error("sign page: db error:", e);
    return (
      <div className="sign-wrap">
        <div className="alert error">
          システムに一時的な問題が発生しています。お手数ですが時間をおいて再度お試しください。
        </div>
      </div>
    );
  }

  // 無効なトークン
  if (!signer) {
    return (
      <div className="sign-wrap">
        <div className="alert error">
          この署名リンクは無効です。お手数ですがご担当者へお問い合わせください。
        </div>
      </div>
    );
  }

  const contract = signer.contract;

  // 取消・拒否済み
  if (["CANCELLED", "DECLINED"].includes(contract.status)) {
    return (
      <div className="sign-wrap">
        <div className="alert error">
          この契約は無効化されています。ご担当者へお問い合わせください。
        </div>
      </div>
    );
  }

  // まだ送信されていない（下書き）
  if (contract.status === "DRAFT") {
    return (
      <div className="sign-wrap">
        <div className="alert info">
          この契約はまだ署名受付が開始されていません。
        </div>
      </div>
    );
  }

  // 閲覧を記録
  await markViewedAction(params.token);

  const alreadySigned = signer.status === "SIGNED";

  return (
    <div className="sign-wrap">
      <div style={{ marginBottom: 16 }}>
        <div className="muted">
          {CATEGORY_LABELS[contract.category] ?? contract.category}
        </div>
        <h1>{contract.title}</h1>
        <p className="muted">
          署名者：{signer.name} 様（{signer.email}）
        </p>
      </div>

      <div className="sign-doc">{contract.body}</div>

      {alreadySigned ? (
        <div className="consent-box">
          <div className="alert success" style={{ marginBottom: 0 }}>
            ✓ この契約には既に署名済みです。ご対応ありがとうございました。
          </div>
        </div>
      ) : (
        <SignForm token={params.token} signerName={signer.name} />
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 24, textAlign: "center" }}>
        本ページでの操作（同意・署名）は、日時・IPアドレスとともに記録されます。
      </p>
    </div>
  );
}
