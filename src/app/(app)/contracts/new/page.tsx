import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewContractForm } from "./NewContractForm";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const [allTemplates, clients, staffList] = await Promise.all([
    prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, category: true },
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
  ]);

  // 重要事項説明書は契約テンプレート選択肢から除外し、専用selectに回す
  const templates = allTemplates.filter((t) => t.category !== "EXPLANATION");
  const explanationTemplates = allTemplates.filter(
    (t) => t.category === "EXPLANATION"
  );

  return (
    <>
      <h1>新規契約の作成</h1>
      {templates.length === 0 ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <p>
            有効なテンプレートがありません。先に
            <Link href="/templates/new"> テンプレートを作成 </Link>
            してください。
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <NewContractForm
            templates={templates}
            explanationTemplates={explanationTemplates}
            clients={clients}
            staffList={staffList}
          />
        </div>
      )}
    </>
  );
}
