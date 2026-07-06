import { PrismaClient } from "@prisma/client";

// サーバーレス環境＋Supabase pooler では、アイドル接続が切られたり接続数が
// 逼迫したりして、単発の「接続できない」エラーが散発的に起きる。
// これらの一時的な接続エラーは自動リトライして、画面が落ちないようにする。
function isRetryableDbError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code ?? "";
  if (["P1001", "P1002", "P1008", "P1017"].includes(code)) return true;
  return /can't reach database|connection|closed|terminated|reset by peer|econnreset|timed out|too many|server has gone|engine is not yet connected|prepared statement/i.test(
    msg
  );
}

function createPrisma(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            lastErr = e;
            if (!isRetryableDbError(e) || attempt === 2) throw e;
            // 150ms, 300ms と待って再試行
            await new Promise((r) => setTimeout(r, 150 * 2 ** attempt));
          }
        }
        throw lastErr;
      },
    },
  });
  // 拡張後もメソッドの型は同じなので、既存コードのため PrismaClient として扱う
  return client as unknown as PrismaClient;
}

// 開発時のホットリロードで PrismaClient が多重生成されるのを防ぐ
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
