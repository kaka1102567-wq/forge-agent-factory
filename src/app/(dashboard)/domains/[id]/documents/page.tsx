import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DocumentListTable } from "@/components/features/doc-studio/document-list-table";
import { DomainDocumentsActions } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DomainDocumentsPage({ params }: Props) {
  const { id } = await params;

  const domain = await db.domain.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
    },
  });

  if (!domain) notFound();

  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
  });

  // Serialize documents cho client component
  const documents = domain.documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    qualityScore: doc.qualityScore,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    template: doc.template
      ? { id: doc.template.id, name: doc.template.name, category: doc.template.category }
      : null,
  }));

  const serializedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    type: t.type,
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/domains" className="hover:text-foreground">
          Domains
        </Link>
        <span>/</span>
        <span className="text-foreground">{domain.name}</span>
        <span>/</span>
        <span className="text-foreground">Documents</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Tai lieu training cho domain &ldquo;{domain.name}&rdquo;
          </p>
        </div>
        <DomainDocumentsActions
          domainId={domain.id}
          templates={serializedTemplates}
        />
      </div>

      {/* Document list */}
      <DocumentListTable documents={documents} />
    </div>
  );
}
