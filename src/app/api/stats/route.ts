import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/auth/helpers";

// GET /api/stats — Aggregate stats cho dashboard
export async function GET() {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Tổng agents + deployed count + quick mode count
    const [totalAgents, deployedAgents, quickModeAgents] = await Promise.all([
      db.agent.count(),
      db.agent.count({ where: { status: "DEPLOYED" } }),
      db.agent.count({ where: { quickMode: true } }),
    ]);

    // Avg quality score từ documents có score
    const qualityAgg = await db.document.aggregate({
      _avg: { qualityScore: true },
      where: { qualityScore: { not: null } },
    });

    // Monthly cost — tháng hiện tại vs tháng trước
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
        where: {
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    // Active alerts — deployments với healthStatus DEGRADED hoặc DOWN
    const activeAlerts = await db.deployment.count({
      where: {
        status: "ACTIVE",
        healthStatus: { in: ["DEGRADED", "DOWN"] },
      },
    });

    return NextResponse.json({
      totalAgents,
      deployedAgents,
      quickModeAgents,
      avgQualityScore: Math.round((qualityAgg._avg.qualityScore ?? 0) * 100) / 100,
      monthlyCost: thisMonthCost._sum.cost ?? 0,
      lastMonthCost: lastMonthCost._sum.cost ?? 0,
      activeAlerts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
