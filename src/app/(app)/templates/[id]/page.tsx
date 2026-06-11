import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  updateTemplateAction,
  deleteTemplateAction,
} from "@/app/actions/templates";
import { TemplateForm } from "../TemplateForm";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const template = await prisma.contractTemplate.findUnique({
    where: { id: params.id },
  });
  if (!template) notFound();

  const updateWithId = updateTemplateAction.bind(null, template.id);
  const deleteWithId = deleteTemplateAction.bind(null, template.id);

  return (
    <>
      <h1>テンプレート編集</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <TemplateForm
          action={updateWithId}
          initial={{
            title: template.title,
            category: template.category,
            description: template.description,
            body: template.body,
            isActive: template.isActive,
          }}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>テンプレートの削除</h2>
        <p className="muted">
          契約で使用済みのテンプレートは履歴保持のため「無効化」されます。
        </p>
        <form action={deleteWithId}>
          <button className="btn danger">このテンプレートを削除/無効化</button>
        </form>
      </div>
    </>
  );
}
