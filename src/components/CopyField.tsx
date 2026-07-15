"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボード非対応環境では選択して手動コピー
      window.prompt("以下のURLをコピーしてください", value);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="copy-url" style={{ flex: "1 1 220px" }}>
        {value}
      </span>
      <button
        type="button"
        className="btn secondary"
        style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
        onClick={copy}
      >
        {copied ? "コピーしました" : "URLをコピー"}
      </button>
    </div>
  );
}
