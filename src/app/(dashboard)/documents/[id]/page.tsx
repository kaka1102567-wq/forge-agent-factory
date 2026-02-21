import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { DocStudioEditor } from "@/components/features/doc-studio/doc-studio-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocStudioPage({ params }: Props) {
  const { id } = await params;

  const document = await db.document.findUnique({
    where: { id },
    include: { domain: true, template: true },
  });

  if (!document) notFound();

  // Serialize cho client component
  const docData = {
    id: document.id,
    title: document.title,
    content: document.content,
    status: document.status,
    version: document.version,
    qualityScore: document.qualityScore,
    qualityDetail: document.qualityDetail as any,
    versionHistory: (document.versionHistory as any[]) ?? [],
    domain: { id: document.domain.id, name: document.domain.name },
    template: document.template
      ? {
          id: document.template.id,
          name: document.template.name,
          category: document.template.category,
        }
      : null,
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/domains" className="hover:text-foreground">
          Domains
        </Link>
        <span>/</span>
        <Link
          href={`/domains/${document.domain.id}/documents`}
          className="hover:text-foreground"
        >
          {document.domain.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{document.title}</span>
      </nav>

      <DocStudioEditor document={docData} />
    </div>
  );
}
