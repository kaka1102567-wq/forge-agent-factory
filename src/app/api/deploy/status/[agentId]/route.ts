import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/deploy/status/[agentId] — Trạng thái deploy + health của agent
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  try {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        deployments: { orderBy: { createdAt: "desc" } },
        domain: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent không tồn tại" },
        { status: 404 }
      );
    }

    const activeDeployments = agent.deployments.filter(
      (d) => d.status === "ACTIVE"
    );

    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.name,
      agentStatus: agent.status,
      deployments: agent.deployments.map((d) => ({
        id: d.id,
        channel: d.channel,
        status: d.status,
        healthStatus: d.healthStatus,
        lastHealthCheck: d.lastHealthCheck,
        healthDetails: d.healthDetails,
        createdAt: d.createdAt,
      })),
      activeChannels: activeDeployments.map((d) => d.channel),
      overallHealth: deriveOverallHealth(activeDeployments),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Tổng hợp health từ tất cả active deployments
function deriveOverallHealth(
  deployments: Array<{ healthStatus: string }>
): string {
  if (deployments.length === 0) return "UNKNOWN";
  if (deployments.some((d) => d.healthStatus === "DOWN")) return "DOWN";
  if (deployments.some((d) => d.healthStatus === "DEGRADED")) return "DEGRADED";
  if (deployments.every((d) => d.healthStatus === "HEALTHY")) return "HEALTHY";
  return "UNKNOWN";
}
