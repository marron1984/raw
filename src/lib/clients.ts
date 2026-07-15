import { prisma } from "./db";

// 署名者を相手先マスタへ自動登録し、そのIDを返す。
// 同じ氏名（trim一致）が既に登録されていれば新規作成せずそのIDへ紐付ける。
// マスタ登録に失敗しても契約作成は止めない（fail-graceful）。
export async function ensureClientForSigner(signer: {
  name: string;
  email?: string | null;
}): Promise<string | null> {
  try {
    const name = signer.name.trim();
    if (!name) return null;
    const email = signer.email?.trim() || null;

    const existing = await prisma.client.findFirst({
      where: { name },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      // メール未登録なら今回の入力で補完しておく
      if (!existing.email && email) {
        await prisma.client.update({
          where: { id: existing.id },
          data: { email },
        });
      }
      return existing.id;
    }

    const created = await prisma.client.create({
      data: { name, email, category: "OTHER", note: "契約作成時に自動登録" },
    });
    return created.id;
  } catch (e) {
    console.error("ensureClientForSigner failed:", e);
    return null;
  }
}
