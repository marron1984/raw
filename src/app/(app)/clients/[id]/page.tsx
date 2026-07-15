import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { updateClientAction, deleteClientAction } from "@/app/actions/clients";
import { ClientForm } from "../ClientForm";
import { ContractStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function EditClientPage({
  params,
}: {
  params: { id: string };
}) {
  await ensureBootstrap();
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();

  // この相手先の契約一覧（自動リンク済みのもの＋同姓同名の過去契約もまとめる）
  const contracts = await prisma.contract.findMany({
    where: {
      signers: {
        some: { OR: [{ clientId: client.id }, { name: client.name }] },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const updateWithId = updateClientAction.bind(null, client.id);
  const deleteWithId = deleteClientAction.bind(null, client.id);

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href="/clients" className="muted">
          ← 相手先一覧へ
        </Link>
      </div>
      <h1>{client.name} 様</h1>

      {/* この相手先の契約（グルーピング表示） */}
      <h2>契約書類（{contracts.length}件）</h2>
      {contracts.length === 0 ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            この相手先の契約書類はまだありません。契約を作成すると自動でここにまとまります。
          </p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>書類名</th>
                <th>状態</th>
                <th>作成日</th>
                <th>締結日</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contracts/${c.id}`}>{c.title}</Link>
                  </td>
                  <td>
                    <ContractStatusBadge status={c.status} />
                  </td>
                  <td className="muted">{fmt(c.createdAt)}</td>
                  <td className="muted">{fmt(c.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>相手先情報の編集</h2>
      <div className="panel">
        <ClientForm
          action={updateWithId}
          initial={{
            name: client.name,
            kana: client.kana,
            email: client.email,
            phone: client.phone,
            address: client.address,
            category: client.category,
            note: client.note,
          }}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>削除</h2>
        <p className="muted">この相手先を削除します（作成済みの契約には影響しません）。</p>
        <form action={deleteWithId}>
          <button className="btn danger">この相手先を削除</button>
        </form>
      </div>
    </>
  );
}
