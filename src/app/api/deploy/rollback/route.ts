import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";

const RollbackSchema = z.object({
  agentId: z.string().min(1),
  channel: z.enum(["TELEGRAM", "WEB"]),
});

// POST /api/deploy/rollback — Rollback deployment, khôi phục systemPrompt cũ
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, channel } = RollbackSchema.parse(body);

    // Tìm deployment hiện tại
    const deployment = await db.deployment.findUnique({
      where: { agentId_channel: { agentId, channel } },
      include: { agent: true },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment không tồn tại" },
        { status: 404 }
      );
    }

    if (deployment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Deployment không ở trạng thái ACTIVE" },
        { status: 400 }
      );
    }

    // Khôi phục systemPrompt từ snapshot
    await db.agent.update({
      where: { id: agentId },
      data: { systemPrompt: deployment.systemPromptSnapshot },
    });

    // Cập nhật deployment status → ROLLED_BACK
    const updated = await db.deployment.update({
      where: { agentId_channel: { agentId, channel } },
      data: { status: "ROLLED_BACK", healthStatus: "UNKNOWN" },
    });

    // Kiểm tra xem agent còn deployment ACTIVE nào không
    const activeDeployments = await db.deployment.count({
      where: { agentId, status: "ACTIVE" },
    });

    // Nếu không còn deployment nào → về ACTIVE (tested nhưng chưa deploy)
    if (activeDeployments === 0) {
      await db.agent.update({
        where: { id: agentId },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
