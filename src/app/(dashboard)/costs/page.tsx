export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { CostDashboard } from "@/components/features/cost-dashboard/cost-dashboard";

export default async function CostsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch cost logs cho 30 ngày
  const costLogs = await db.costLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      model: true,
      cost: true,
      task: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
      agentId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate theo ngày
  const dailyMap = new Map<string, { haiku: number; sonnet: number; opus: number; total: number }>();
  for (const log of costLogs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(day) ?? { haiku: 0, sonnet: 0, opus: 0, total: 0 };
    const model = log.model as "haiku" | "sonnet" | "opus";
    entry[model] += log.cost;
    entry.total += log.cost;
    dailyMap.set(day, entry);
  }

  const daily = Array.from(dailyMap.entries()).map(([date, costs]) => ({
    date,
    haiku: Math.round(costs.haiku * 1000000) / 1000000,
    sonnet: Math.round(costs.sonnet * 1000000) / 1000000,
    opus: Math.round(costs.opus * 1000000) / 1000000,
    total: Math.round(costs.total * 1000000) / 1000000,
  }));

  // Per-agent costs
  const agentMap = new Map<string, { cost: number; requests: number; tokens: number }>();
  for (const log of costLogs) {
    if (!log.agentId) continue;
    const entry = agentMap.get(log.agentId) ?? { cost: 0, requests: 0, tokens: 0 };
    entry.cost += log.cost;
    entry.requests += 1;
    entry.tokens += log.inputTokens + log.outputTokens;
    agentMap.set(log.agentId, entry);
  }

  const agentIds = Array.from(agentMap.keys());
  const agents = agentIds.length > 0
    ? await db.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true },
      })
    : [];

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));
  const perAgent = Array.from(agentMap.entries())
    .map(([agentId, data]) => ({
      agentId,
      name: agentNameMap.get(agentId) ?? "Unknown",
      cost: Math.round(data.cost * 1000000) / 1000000,
      requests: data.requests,
      tokens: data.tokens,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Model totals
  const modelTotals = { haiku: 0, sonnet: 0, opus: 0 };
  let totalTokens = 0;
  for (const log of costLogs) {
    const model = log.model as "haiku" | "sonnet" | "opus";
    modelTotals[model] += log.cost;
    totalTokens += log.inputTokens + log.outputTokens;
  }

  return (
    <CostDashboard
      daily={daily}
      perAgent={perAgent}
      modelTotals={{
        haiku: Math.round(modelTotals.haiku * 1000000) / 1000000,
        sonnet: Math.round(modelTotals.sonnet * 1000000) / 1000000,
        opus: Math.round(modelTotals.opus * 1000000) / 1000000,
      }}
      totalCost={costLogs.reduce((sum, l) => sum + l.cost, 0)}
      totalRequests={costLogs.length}
      totalTokens={totalTokens}
    />
  );
}
