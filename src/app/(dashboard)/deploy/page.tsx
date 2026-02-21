export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { DeployCenter } from "@/components/features/deploy-center/deploy-center";

export default async function DeployPage() {
  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      domain: true,
      testResults: { orderBy: { round: "asc" } },
      deployments: { orderBy: { createdAt: "desc" } },
    },
  });

  // Serialize cho client component
  const serialized = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    archetype: agent.archetype,
    status: agent.status,
    quickMode: agent.quickMode,
    domain: { name: agent.domain.name },
    testResults: agent.testResults.map((r) => ({
      round: r.round,
      passed: r.passed,
      score: r.score,
    })),
    deployments: agent.deployments.map((d) => ({
      id: d.id,
      channel: d.channel,
      status: d.status,
      healthStatus: d.healthStatus,
      lastHealthCheck: d.lastHealthCheck?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  }));

  return <DeployCenter agents={serialized} />;
}
