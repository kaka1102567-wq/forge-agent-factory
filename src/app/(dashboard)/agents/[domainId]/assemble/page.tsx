import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AgentAssembly } from "@/components/features/agent-assembly/agent-assembly";

interface Props {
  params: Promise<{ domainId: string }>;
}

export default async function AssembleAgentPage({ params }: Props) {
  const { domainId } = await params;

  const domain = await db.domain.findUnique({
    where: { id: domainId },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
    },
  });

  if (!domain) notFound();

  // Serialize documents cho client component
  const documents = domain.documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    qualityScore: doc.qualityScore,
    category: doc.template?.category ?? "general",
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/domains" className="hover:text-foreground">
          Domains
        </Link>
        <span>/</span>
        <Link href={`/domains/${domain.id}/documents`} className="hover:text-foreground">
          {domain.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Lap rap Agent</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Lap rap Agent</h2>
        <p className="text-sm text-muted-foreground">
          Chon tai lieu va cau hinh de tao AI agent cho &ldquo;{domain.name}&rdquo;
        </p>
      </div>

      {/* Assembly interface */}
      <AgentAssembly
        domainId={domain.id}
        domainName={domain.name}
        domainFunction={domain.function}
        domainChannels={domain.channels}
        documents={documents}
      />
    </div>
  );
}
