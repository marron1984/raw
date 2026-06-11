import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 環境変数が無くてもそのまま動くよう、既定の管理者アカウントを用意。
  // パスワードは秘密情報のためコードに実値を書かず、SEED_ADMIN_PASSWORD で渡す。
  const email = process.env.SEED_ADMIN_EMAIL ?? "yoshida@aska-g.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const name = process.env.SEED_ADMIN_NAME ?? "吉田";

  // 初期管理者（パスワードは毎回 .env / 既定値に合わせて更新する）
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN", isActive: true },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`✔ 管理者ユーザー: ${admin.email}`);

  // サンプルテンプレート（既に存在する場合はスキップ）
  const existing = await prisma.contractTemplate.count();
  if (existing === 0) {
    await prisma.contractTemplate.create({
      data: {
        title: "建物賃貸借契約書（入居契約）",
        category: "RESIDENCE",
        description: "入居者との賃貸借契約の標準テンプレート",
        createdById: admin.id,
        body: `建物賃貸借契約書

貸主（以下「甲」という）と借主（以下「乙」という）は、下記物件について次のとおり賃貸借契約を締結する。

【契約者情報】
借主氏名：{{tenant_name}}
住所：{{tenant_address}}
連絡先：{{tenant_phone}}

【物件の表示】
物件名称：{{property_name}}
所在地：{{property_address}}
部屋番号：{{room_no}}

【契約条件】
賃料：月額 {{rent}} 円
共益費：月額 {{common_fee}} 円
敷金：{{deposit}} 円
契約期間：{{start_date}} から {{end_date}} まで

第1条（使用目的）
乙は本物件を住居としてのみ使用し、他の目的に使用してはならない。

第2条（賃料の支払い）
乙は毎月末日までに翌月分の賃料を甲の指定する方法で支払うものとする。

第3条（禁止事項）
乙は甲の書面による承諾なく、本物件の増改築、模様替え、又は転貸を行ってはならない。

第4条（契約の解除）
当事者の一方が本契約に違反した場合、相手方は催告の上、本契約を解除することができる。

以上の内容に同意し、本契約を締結します。`,
      },
    });

    await prisma.contractTemplate.create({
      data: {
        title: "訪問介護利用契約書",
        category: "CARE",
        description: "訪問介護サービス利用者との利用契約テンプレート",
        createdById: admin.id,
        body: `訪問介護利用契約書

事業者（以下「甲」という）と利用者（以下「乙」という）は、訪問介護サービスの利用に関し、次のとおり契約を締結する。

【利用者情報】
利用者氏名：{{user_name}}
生年月日：{{birth_date}}
住所：{{user_address}}
連絡先：{{user_phone}}
被保険者番号：{{insurance_no}}

【サービス内容】
サービス種別：訪問介護（{{service_type}}）
提供開始日：{{start_date}}
利用曜日・時間：{{schedule}}
担当事業所：{{office_name}}

第1条（目的）
甲は乙に対し、介護保険法に基づく訪問介護サービスを提供する。

第2条（サービスの提供）
甲は、乙の心身の状況に応じて、適切な訪問介護サービスを提供するものとする。

第3条（利用料金）
乙は、介護保険給付の自己負担分及び保険外サービスの費用を、甲の定める方法により支払う。

第4条（秘密保持）
甲及びその従業者は、業務上知り得た乙の秘密を正当な理由なく第三者に漏らしてはならない。

第5条（契約の終了）
乙はいつでも本契約を解約することができる。甲は正当な理由がある場合に限り契約を解除できる。

以上の内容に同意し、本契約を締結します。`,
      },
    });
    console.log("✔ サンプルテンプレートを2件作成しました");
  } else {
    console.log("ℹ テンプレートが既に存在するため作成をスキップしました");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
