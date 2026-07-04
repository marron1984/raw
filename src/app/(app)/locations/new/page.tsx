import { createLocationAction } from "@/app/actions/locations";
import { LocationForm } from "../LocationForm";

export const dynamic = "force-dynamic";

export default function NewLocationPage() {
  return (
    <>
      <h1>拠点の登録</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <LocationForm action={createLocationAction} />
      </div>
    </>
  );
}
