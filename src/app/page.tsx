import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// ビルド時の事前生成でDBに触れないよう、常に動的レンダリング
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
