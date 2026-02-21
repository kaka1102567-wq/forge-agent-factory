export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";

export default async function DashboardPage() {
  // Fetch stats
  const [totalAgents, deployedAgents] = await Promise.all([
    db.agent.count(),
    db.agent.count({ where: { status: "DEPLOYED" } }),
  ]);

  const qualityAgg = await db.document.aggregate({
    _avg: { qualityScore: true },
    where: { qualityScore: { not: null } },
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonthCost, lastMonthCost] = await Promise.all([
    db.costLog.aggregate({
      _sum: { cost: true },
      where: { createdAt: { gte: thisMonthStart } },
    }),
    db.costLog.aggregate({
      _sum: { cost: true },
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
  ]);

  const activeAlerts = await db.deployment.count({
    where: { status: "ACTIVE", healthStatus: { in: ["DEGRADED", "DOWN"] } },
  });

  // Fetch agents cho grid
  const agents = await db.agent.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      domain: { select: { name: true } },
      testResults: { orderBy: { round: "desc" }, take: 1 },
    },
  });

  const serializedAgents = agents.map((a) => ({
    id: a.id,
    name: a.name,
    archetype: a.archetype,
    status: a.status,
    domainName: a.domain.name,
    qualityScore: a.testResults[0]?.score ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));

  // Fetch activity feed
  const activities = await db.activityLog.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  const serializedActivities = activities.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    agentName: a.agent?.name ?? null,
    userName: a.user?.name ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <DashboardContent
      stats={{
        totalAgents,
        deployedAgents,
        avgQualityScore: Math.round((qualityAgg._avg.qualityScore ?? 0) * 100) / 100,
        monthlyCost: thisMonthCost._sum.cost ?? 0,
        lastMonthCost: lastMonthCost._sum.cost ?? 0,
        activeAlerts,
      }}
      agents={serializedAgents}
      activities={serializedActivities}
    />
  );
}
