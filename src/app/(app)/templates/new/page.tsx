import { createTemplateAction } from "@/app/actions/templates";
import { TemplateForm } from "../TemplateForm";

// ビルド時の事前生成でDBに触れないよう、常に動的レンダリング
export const dynamic = "force-dynamic";

export default function NewTemplatePage() {
  return (
    <>
      <h1>新規テンプレート</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <TemplateForm action={createTemplateAction} />
      </div>
    </>
  );
}
