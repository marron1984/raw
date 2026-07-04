import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { DOC_SETS } from "@/lib/doc-sets";
import { extractPlaceholders } from "@/lib/template";
import { NewSetForm } from "./NewSetForm";

export const dynamic = "force-dynamic";

export default async function NewContractSetPage() {
  await ensureBootstrap();
  const [templates, clients, staffList, locationRows] = await Promise.all([
    prisma.contractTemplate.findMany({
      where: { isActive: true },
      select: { title: true, body: true },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true, address: true },
    }),
    prisma.staff.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, fieldsJson: true },
    }),
  ]);

  const locations = locationRows.map((l) => {
    let fields: Record<string, string> = {};
    try {
      fields = JSON.parse(l.fieldsJson);
    } catch {}
    return { id: l.id, name: l.name, fields };
  });

  const byTitle = new Map(templates.map((t) => [t.title, t.body]));

  // 各セットの差し込み項目（セット内全書類のプレースホルダを結合）と利用可否を算出
  const sets = DOC_SETS.map((s) => {
    const titles = s.items.flatMap((i) =>
      i.explanationTitle ? [i.templateTitle, i.explanationTitle] : [i.templateTitle]
    );
    const missing = titles.filter((t) => !byTitle.has(t));
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const t of titles) {
      const body = byTitle.get(t);
      if (!body) continue;
      for (const k of extractPlaceholders(body)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    return {
      key: s.key,
      label: s.label,
      description: s.description,
      docTitles: s.items.map((i) =>
        i.explanationTitle
          ? `${i.templateTitle}（＋重説）`
          : i.templateTitle
      ),
      keys,
      available: missing.length === 0,
    };
  }).filter((s) => s.available);

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href="/contracts" className="muted">
          ← 契約一覧へ
        </Link>
      </div>
      <h1>書類セットの一括作成</h1>
      <p className="muted">
        相手先と共通項目を1回入力するだけで、セット内の全書類（契約書・重説・同意書など）をまとめて下書き作成します。
      </p>
      <div style={{ marginTop: 16 }}>
        <NewSetForm sets={sets} clients={clients} staffList={staffList} locations={locations} />
      </div>
    </>
  );
}
