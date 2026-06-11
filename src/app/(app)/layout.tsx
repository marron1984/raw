import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DB未接続でもクラッシュさせず、ログイン画面（エラー表示あり）へ誘導する
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("app layout: db error:", e);
  }
  if (!user) redirect("/login");

  return (
    <>
      <TopNav user={user} />
      <main className="container">{children}</main>
    </>
  );
}
