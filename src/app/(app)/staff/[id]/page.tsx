import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateStaffAction, deleteStaffAction } from "@/app/actions/staff";
import { StaffForm } from "../StaffForm";

export const dynamic = "force-dynamic";

export default async function EditStaffPage({
  params,
}: {
  params: { id: string };
}) {
  const staff = await prisma.staff.findUnique({ where: { id: params.id } });
  if (!staff) notFound();

  const updateWithId = updateStaffAction.bind(null, staff.id);
  const deleteWithId = deleteStaffAction.bind(null, staff.id);

  return (
    <>
      <h1>担当者の編集</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <StaffForm
          action={updateWithId}
          initial={{ name: staff.name, email: staff.email, phone: staff.phone }}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>削除</h2>
        <p className="muted">この担当者を削除します（作成済みの契約には影響しません）。</p>
        <form action={deleteWithId}>
          <button className="btn danger">この担当者を削除</button>
        </form>
      </div>
    </>
  );
}
