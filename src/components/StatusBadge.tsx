import { STATUS_LABELS, SIGNER_STATUS_LABELS } from "@/lib/template";

const CONTRACT_COLOR: Record<string, string> = {
  DRAFT: "gray",
  SENT: "blue",
  VIEWED: "amber",
  SIGNED: "green",
  DECLINED: "red",
  CANCELLED: "gray",
};

const SIGNER_COLOR: Record<string, string> = {
  PENDING: "gray",
  VIEWED: "amber",
  SIGNED: "green",
  DECLINED: "red",
};

export function ContractStatusBadge({ status }: { status: string }) {
  const color = CONTRACT_COLOR[status] ?? "gray";
  return <span className={`badge ${color}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function SignerStatusBadge({ status }: { status: string }) {
  const color = SIGNER_COLOR[status] ?? "gray";
  return (
    <span className={`badge ${color}`}>
      {SIGNER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
