import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewContractForm } from "./NewContractForm";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const templates = await prisma.contractTemplate.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, category: true },
  });

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
          <NewContractForm templates={templates} />
        </div>
      )}
    </>
  );
}
