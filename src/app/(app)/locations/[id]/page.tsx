import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureBootstrap } from "@/lib/bootstrap";
import {
  updateLocationAction,
  deleteLocationAction,
} from "@/app/actions/locations";
import { LocationForm } from "../LocationForm";

export const dynamic = "force-dynamic";

export default async function EditLocationPage({
  params,
}: {
  params: { id: string };
}) {
  await ensureBootstrap();
  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });
  if (!location) notFound();

  let fields: Record<string, string> = {};
  try {
    fields = JSON.parse(location.fieldsJson);
  } catch {}

  const updateWithId = updateLocationAction.bind(null, location.id);
  const deleteWithId = deleteLocationAction.bind(null, location.id);

  return (
    <>
      <h1>拠点の編集</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <LocationForm
          action={updateWithId}
          initial={{ name: location.name, note: location.note, fields }}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>削除</h2>
        <p className="muted">この拠点を削除します（作成済みの契約には影響しません）。</p>
        <form action={deleteWithId}>
          <button className="btn danger">この拠点を削除</button>
        </form>
      </div>
    </>
  );
}
