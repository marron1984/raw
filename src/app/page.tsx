import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// ビルド時の事前生成でDBに触れないよう、常に動的レンダリング
export const dynamic = "force-dynamic";

export default async function Home() {
  // DB未接続でも必ずログイン画面へ進めるようにする
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("home: db error:", e);
  }
  redirect(user ? "/dashboard" : "/login");
}
