import { db } from "@/lib/db";
import { DocumentListTable } from "@/components/features/doc-studio/document-list-table";

export default async function DocumentsPage() {
  const documents = await db.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: { domain: true, template: true },
  });

  const serialized = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    qualityScore: doc.qualityScore,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    domain: { id: doc.domain.id, name: doc.domain.name },
    template: doc.template
      ? { id: doc.template.id, name: doc.template.name, category: doc.template.category }
      : null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Tao va quan ly tai lieu training cho agent.
        </p>
      </div>

      <DocumentListTable documents={serialized} showDomain />
    </div>
  );
}
