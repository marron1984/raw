import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1>Dケア電子契約システム</h1>
          <p className="muted">社内アカウントでログインしてください</p>
        </div>
        <div className="panel">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
