import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

// ビルド時の事前生成でDBに触れないよう、常に動的レンダリング
export const dynamic = "force-dynamic";

export default function Home() {
  redirect(isAuthenticated() ? "/dashboard" : "/login");
}
