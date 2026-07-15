import { createClientAction } from "@/app/actions/clients";
import { ClientForm } from "../ClientForm";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <>
      <h1>相手先の登録</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <ClientForm action={createClientAction} />
      </div>
    </>
  );
}
