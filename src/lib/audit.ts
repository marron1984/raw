import { headers } from "next/headers";
import { prisma } from "./db";

// リクエストヘッダからクライアントIPを推定
export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function recordAudit(params: {
  contractId: string;
  event: string;
  actor: string;
  detail?: string;
  ipAddress?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      contractId: params.contractId,
      event: params.event,
      actor: params.actor,
      detail: params.detail,
      ipAddress: params.ipAddress,
    },
  });
}
