import { createStaffAction } from "@/app/actions/staff";
import { StaffForm } from "../StaffForm";

export const dynamic = "force-dynamic";

export default function NewStaffPage() {
  return (
    <>
      <h1>担当者の登録</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <StaffForm action={createStaffAction} />
      </div>
    </>
  );
}
