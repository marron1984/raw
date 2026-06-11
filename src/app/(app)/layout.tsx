import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <TopNav user={user} />
      <main className="container">{children}</main>
    </>
  );
}
