// 契約本文を表示するコンポーネント。
// 「|」区切りの連続行は表として描画し、それ以外は改行を保った段落として表示する
// （料金表などがテキストのまま間延びして表示されるのを防ぐ）。

type Block =
  | { type: "text"; content: string }
  | { type: "table"; rows: string[][] };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let textBuf: string[] = [];
  let tableBuf: string[][] = [];
  const flushText = () => {
    if (textBuf.length) {
      blocks.push({ type: "text", content: textBuf.join("\n") });
      textBuf = [];
    }
  };
  const flushTable = () => {
    if (tableBuf.length) {
      blocks.push({ type: "table", rows: tableBuf });
      tableBuf = [];
    }
  };
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("|")) {
      flushText();
      tableBuf.push(
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((s) => s.trim())
      );
    } else {
      flushTable();
      textBuf.push(line);
    }
  }
  flushText();
  flushTable();
  return blocks;
}

export function DocBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.type === "text" ? (
          <div key={i} style={{ whiteSpace: "pre-wrap" }}>
            {b.content}
          </div>
        ) : (
          <table key={i} className="doc-table">
            <thead>
              <tr>
                {b.rows[0].map((c, j) => (
                  <th key={j}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.slice(1).map((row, r) => (
                <tr key={r}>
                  {row.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
