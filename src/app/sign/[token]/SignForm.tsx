"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signAction } from "@/app/actions/sign";
import { SignaturePad } from "@/components/SignaturePad";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn success"
      style={{ marginTop: 8 }}
      disabled={pending || disabled}
    >
      {pending ? "送信中..." : "同意して署名を確定する"}
    </button>
  );
}

export function SignForm({
  token,
  signerName,
}: {
  token: string;
  signerName: string;
}) {
  const action = signAction.bind(null, token);
  const [state, formAction] = useFormState(action, {});
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  if (state?.done) {
    return (
      <div className="consent-box">
        <div className="alert success" style={{ marginBottom: 0 }}>
          ✓ 署名が完了しました。ご対応ありがとうございました。
          この画面は閉じていただいて構いません。
        </div>
      </div>
    );
  }

  const canSubmit = agreed && signature !== "";

  return (
    <form action={formAction} className="consent-box">
      <h2 style={{ marginTop: 0 }}>電子署名</h2>
      {state?.error && <div className="alert error">{state.error}</div>}
      <p className="muted">
        上記の契約内容をご確認のうえ、同意される場合は下記にチェックを入れ、
        枠内にご署名ください。スマートフォンでは指でサインできます。
      </p>

      <div className="checkbox-row">
        <input
          id="agree"
          name="agree"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <label htmlFor="agree" style={{ margin: 0 }}>
          契約内容を確認し、これに同意します。本操作が電子的な署名であることを承諾します。
        </label>
      </div>

      <label>ご署名（{signerName} 様）</label>
      <SignaturePad onChange={setSignature} />

      {/* 署名画像（PNG data URL）をサーバーへ送る */}
      <input type="hidden" name="signature" value={signature} />

      <SubmitButton disabled={!canSubmit} />
      {!canSubmit && (
        <p className="hint" style={{ marginTop: 6 }}>
          同意のチェックと署名の記入の両方が必要です。
        </p>
      )}
    </form>
  );
}
