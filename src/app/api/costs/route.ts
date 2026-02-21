import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/costs?from=DATE&to=DATE — Cost data với date range
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Default: 30 ngày gần nhất
    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Chi phí theo ngày + model
    const costLogs = await db.costLog.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      select: {
        model: true,
        cost: true,
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
      ...costs,
    }));

    // Aggregate theo agent
    const agentMap = new Map<string, { agentId: string; cost: number; requests: number }>();
    for (const log of costLogs) {
      if (!log.agentId) continue;
      const entry = agentMap.get(log.agentId) ?? { agentId: log.agentId, cost: 0, requests: 0 };
      entry.cost += log.cost;
      entry.requests += 1;
      agentMap.set(log.agentId, entry);
    }

    // Fetch agent names
    const agentIds = Array.from(agentMap.keys());
    const agents = agentIds.length > 0
      ? await db.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        })
      : [];

    const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));
    const perAgent = Array.from(agentMap.values())
      .map((entry) => ({
        ...entry,
        name: agentNameMap.get(entry.agentId) ?? "Unknown",
      }))
      .sort((a, b) => b.cost - a.cost);

    // Model breakdown totals
    const modelTotals = { haiku: 0, sonnet: 0, opus: 0 };
    for (const log of costLogs) {
      const model = log.model as "haiku" | "sonnet" | "opus";
      modelTotals[model] += log.cost;
    }

    return NextResponse.json({
      daily,
      perAgent,
      modelTotals,
      totalCost: costLogs.reduce((sum, l) => sum + l.cost, 0),
      totalRequests: costLogs.length,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
