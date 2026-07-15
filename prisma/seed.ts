import { PrismaClient } from "@prisma/client";
import { syncCoreData } from "../src/lib/seed-core";

const prisma = new PrismaClient();

// ローカル開発用の手動seed。
// 本番(Vercel)ではアプリ初回アクセス時の bootstrap が同じ処理を自動実行する。
async function main() {
  await syncCoreData(prisma);
  console.log("✔ 管理者・標準テンプレートを同期しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
