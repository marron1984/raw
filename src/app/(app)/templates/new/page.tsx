import { createTemplateAction } from "@/app/actions/templates";
import { TemplateForm } from "../TemplateForm";

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
