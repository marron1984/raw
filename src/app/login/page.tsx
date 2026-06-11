import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // DB未接続でもログイン画面自体は表示できるようにする
  let user = null;
  let dbError = false;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("login page: db error:", e);
    dbError = true;
  }
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
        {dbError && (
          <div className="alert error">
            データベースに接続できません。管理者は DATABASE_URL
            の設定を確認してください。
          </div>
        )}
        <div className="panel">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
