import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateClientAction, deleteClientAction } from "@/app/actions/clients";
import { ClientForm } from "../ClientForm";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();

  const updateWithId = updateClientAction.bind(null, client.id);
  const deleteWithId = deleteClientAction.bind(null, client.id);

  return (
    <>
      <h1>相手先の編集</h1>
      <div className="panel" style={{ marginTop: 16 }}>
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
