import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import {
  sendContractAction,
  startSigningAction,
  cancelContractAction,
  deleteContractAction,
  saveToDriveAction,
} from "@/app/actions/contracts";
import { isDriveConfigured } from "@/lib/drive-save";
import {
  ContractStatusBadge,
  SignerStatusBadge,
} from "@/components/StatusBadge";
import { CopyField } from "@/components/CopyField";
import { ContractBodyEditor } from "./ContractBodyEditor";
import { CATEGORY_LABELS } from "@/lib/template";
import { isEmailConfigured } from "@/lib/email";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  CREATED: "作成",
  EDITED: "本文編集",
  SENT: "送信",
  VIEWED: "閲覧",
  SIGNED: "署名",
  DECLINED: "拒否",
  CANCELLED: "取消",
  COMPLETED: "締結完了",
  PDF_GENERATED: "PDF生成",
  EMAIL_SENT: "メール送信",
  EMAIL_FAILED: "メール送信失敗",
  DRIVE_SAVED: "ドライブ保存",
  DRIVE_FAILED: "ドライブ保存失敗",
  COPY_SENT: "控え送付",
  COPY_FAILED: "控え送付失敗",
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await ensureBootstrap();
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      signers: { orderBy: { order: "asc" } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contract) notFound();

  const appUrl = getAppUrl();
  const emailOn = isEmailConfigured();
  const driveOn = isDriveConfigured();
  const isDraft = contract.status === "DRAFT";
  const isSigned = contract.status === "SIGNED";
  const canShowLinks = ["SENT", "VIEWED", "SIGNED", "DECLINED"].includes(
    contract.status
  );

  const hasUnsigned = contract.signers.some((s) => s.status !== "SIGNED");
  const canStartSigning =
    ["DRAFT", "SENT", "VIEWED"].includes(contract.status) && hasUnsigned;

  const sendWithId = sendContractAction.bind(null, contract.id);
  const startWithId = startSigningAction.bind(null, contract.id);
  const cancelWithId = cancelContractAction.bind(null, contract.id);
  const deleteWithId = deleteContractAction.bind(null, contract.id);
  const saveDriveWithId = saveToDriveAction.bind(null, contract.id);

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href="/contracts" className="muted">
          ← 契約一覧へ
        </Link>
      </div>
      <div className="page-head">
        <h1>{contract.title}</h1>
        <ContractStatusBadge status={contract.status} />
      </div>

      {/* 操作 */}
      <div className="panel">
        <div className="btn-row">
          {canStartSigning && (
            <form action={startWithId}>
              <button className="btn success">契約書を表示して署名へ</button>
            </form>
          )}
          {isDraft && emailOn && (
            <form action={sendWithId}>
              <button className="btn secondary">署名依頼メールを送信する</button>
            </form>
          )}
          {isSigned && (
            <a className="btn" href={`/api/contracts/${contract.id}/pdf`} target="_blank">
              締結済みPDFをダウンロード
            </a>
          )}
          {isSigned && driveOn && (
            <form action={saveDriveWithId}>
              <button className="btn secondary">
                {contract.driveSavedAt
                  ? "Googleドライブに再保存"
                  : "Googleドライブに保存"}
              </button>
            </form>
          )}
          {!isSigned && (
            <a
              className="btn secondary"
              href={`/api/contracts/${contract.id}/pdf`}
              target="_blank"
            >
              現在の内容をPDFで確認
            </a>
          )}
          {!isDraft && !isSigned && contract.status !== "CANCELLED" && (
            <form action={cancelWithId}>
              <button className="btn secondary">契約を取消</button>
            </form>
          )}
          {(isDraft || contract.status === "CANCELLED") && (
            <form action={deleteWithId}>
              <button className="btn danger">削除</button>
            </form>
          )}
        </div>
        {canStartSigning && (
          <p className="hint" style={{ marginTop: 10 }}>
            「契約書を表示して署名へ」を押すと、この端末に契約書が表示され、その場で内容を確認して手書きサインをいただけます。
            署名者にはお使いのスマホ・タブレットをそのままお渡しください。
          </p>
        )}
      </div>

      {/* 基本情報 */}
      <div className="panel">
        <dl className="kv">
          <dt>契約種別</dt>
          <dd>{CATEGORY_LABELS[contract.category] ?? contract.category}</dd>
          <dt>担当者</dt>
          <dd>{contract.staffName ?? "—"}</dd>
          <dt>作成日時</dt>
          <dd>{fmt(contract.createdAt)}</dd>
          <dt>送信日時</dt>
          <dd>{fmt(contract.sentAt)}</dd>
          <dt>締結完了日時</dt>
          <dd>{fmt(contract.completedAt)}</dd>
          {driveOn && (
            <>
              <dt>Googleドライブ</dt>
              <dd>
                {contract.driveSavedAt
                  ? `保存済み（${fmt(contract.driveSavedAt)}）`
                  : "未保存"}
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* 署名者 */}
      <h2>署名者</h2>
      <div className="panel">
        {contract.signers.map((s) => (
          <div key={s.id} className="signer-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{s.name}</strong>{" "}
                {s.email && <span className="muted">（{s.email}）</span>}
              </div>
              <SignerStatusBadge status={s.status} />
            </div>
            <dl className="kv" style={{ marginTop: 8 }}>
              <dt>閲覧日時</dt>
              <dd>{fmt(s.viewedAt)}</dd>
              <dt>署名日時</dt>
              <dd>{fmt(s.signedAt)}</dd>
              {s.status === "SIGNED" && (
                <>
                  <dt>IPアドレス</dt>
                  <dd>{s.ipAddress ?? "—"}</dd>
                </>
              )}
            </dl>
            {s.status === "SIGNED" && s.signatureImage && (
              <div style={{ marginTop: 8 }}>
                <div className="hint" style={{ marginBottom: 4 }}>
                  手書き署名
                </div>
                {/* 署名画像はDB保存のdata URL。eslintのimg警告は意図的に無視 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.signatureImage}
                  alt={`${s.name}の署名`}
                  className="signature-view"
                />
              </div>
            )}
            {canShowLinks && s.status !== "SIGNED" && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="hint">
                    署名用URL（この署名者専用。離れた相手への案内用）
                  </span>
                  <a
                    className="btn secondary"
                    style={{ padding: "5px 12px" }}
                    href={`/sign/${s.token}`}
                  >
                    署名ページを開く
                  </a>
                </div>
                <CopyField value={`${appUrl}/sign/${s.token}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 契約本文 */}
      <ContractBodyEditor
        contractId={contract.id}
        explanationTitle={contract.explanationTitle ?? "重要事項説明書"}
        body={contract.body}
        explanationBody={contract.explanationBody}
        editable={isDraft}
      />

      {/* 監査ログ */}
      <h2>監査ログ（証跡）</h2>
      <div className="panel" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>日時</th>
              <th>イベント</th>
              <th>操作者</th>
              <th>詳細</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {contract.auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="muted">{fmt(log.createdAt)}</td>
                <td>{EVENT_LABELS[log.event] ?? log.event}</td>
                <td>{log.actor}</td>
                <td>{log.detail ?? "—"}</td>
                <td className="muted">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
