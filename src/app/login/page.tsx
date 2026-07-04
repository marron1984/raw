import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

// ビルド時の事前生成でDBに触れないよう、常に動的レンダリング
export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (isAuthenticated()) redirect("/dashboard");

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
      <div style={{ width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1>Dケア電子契約システム</h1>
          <p className="muted">共通パスワードを入力してください</p>
        </div>
        <div className="panel">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
