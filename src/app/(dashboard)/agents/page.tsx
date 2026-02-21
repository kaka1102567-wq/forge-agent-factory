export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { AgentListTable } from "@/components/features/agent-assembly/agent-list-table";

export default async function AgentsPage() {
  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { domain: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agents</h2>
          <p className="text-sm text-muted-foreground">
            Xay dung va cau hinh AI agents.
          </p>
        </div>
      </div>

      {agents.length > 0 ? (
        <AgentListTable
          agents={agents.map((a) => ({
            id: a.id,
            name: a.name,
            archetype: a.archetype,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            domain: { id: a.domain.id, name: a.domain.name },
          }))}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Chua co agent nao</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Chon domain de bat dau lap rap AI agent.
          </p>
          <Button asChild>
            <Link href="/domains">Chon Domain</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
