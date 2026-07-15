"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DocBody } from "@/components/DocBody";
import { updateContractBodyAction } from "@/app/actions/contracts";

type Props = {
  contractId: string;
  explanationTitle: string;
  body: string;
  explanationBody: string | null;
  // 下書きのときだけ編集可能
  editable: boolean;
};

export function ContractBodyEditor({
  contractId,
  explanationTitle,
  body,
  explanationBody,
  editable,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [b, setB] = useState(body);
  const [eb, setEb] = useState(explanationBody ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasExplanation = explanationBody != null;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateContractBodyAction(contractId, {
        body: b,
        explanationBody: hasExplanation ? eb : undefined,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function cancel() {
    setB(body);
    setEb(explanationBody ?? "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <>
        {editable && (
          <div className="btn-row" style={{ margin: "8px 0 4px" }}>
            <button className="btn secondary" onClick={() => setEditing(true)}>
              本文を編集する
            </button>
            <span className="hint">
              署名前のこの段階なら、文言・金額などを直接書き換えられます。
            </span>
          </div>
        )}
        {hasExplanation && (
          <>
            <h2>{explanationTitle}</h2>
            <DocBody className="contract-body" text={explanationBody as string} />
          </>
        )}
        <h2>契約内容</h2>
        <DocBody className="contract-body" text={body} />
      </>
    );
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      <p className="hint" style={{ marginTop: 8 }}>
        文言・金額などを直接編集できます。行頭が「|」の行は表になります（例：<code>| 項目 | 金額 |</code>）。保存すると契約本文が更新され、PDF・署名ページにも反映されます。
      </p>

      {hasExplanation && (
        <>
          <h2>{explanationTitle}</h2>
          <textarea
            value={eb}
            onChange={(e) => setEb(e.target.value)}
            style={{ minHeight: 360, fontFamily: "inherit", lineHeight: 1.9 }}
          />
        </>
      )}

      <h2>契約内容</h2>
      <textarea
        value={b}
        onChange={(e) => setB(e.target.value)}
        style={{ minHeight: 520, fontFamily: "inherit", lineHeight: 1.9 }}
      />

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={save} disabled={isPending}>
          {isPending ? "保存中..." : "保存する"}
        </button>
        <button
          className="btn secondary"
          onClick={cancel}
          disabled={isPending}
        >
          キャンセル
        </button>
      </div>
    </>
  );
}
