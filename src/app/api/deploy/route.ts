import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const DeploySchema = z.object({
  agentId: z.string().min(1),
  channel: z.enum(["TELEGRAM", "WEB"]),
  config: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/deploy — Deploy agent lên kênh
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, channel, config } = DeploySchema.parse(body);

    // Kiểm tra agent tồn tại
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: { testResults: { orderBy: { round: "asc" } } },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent không tồn tại" },
        { status: 404 }
      );
    }

    // Kiểm tra agent đã pass ALL 6 vòng test
    const passedRounds = agent.testResults.filter((r) => r.passed);
    if (passedRounds.length < 6) {
      const missing = 6 - passedRounds.length;
      return NextResponse.json(
        {
          error: `Agent chưa hoàn thành test. Còn thiếu ${missing} vòng test.`,
          passedRounds: passedRounds.length,
          requiredRounds: 6,
        },
        { status: 400 }
      );
    }

    // Tạo hoặc cập nhật deployment
    const configJson = (config ?? {}) as Prisma.InputJsonValue;
    const deployment = await db.deployment.upsert({
      where: { agentId_channel: { agentId, channel } },
      create: {
        agentId,
        channel,
        config: configJson,
        systemPromptSnapshot: agent.systemPrompt,
        status: "ACTIVE",
        healthStatus: "UNKNOWN",
      },
      update: {
        config: configJson,
        systemPromptSnapshot: agent.systemPrompt,
        status: "ACTIVE",
        healthStatus: "UNKNOWN",
        lastHealthCheck: null,
      },
    });

    // Cập nhật agent status → DEPLOYED
    await db.agent.update({
      where: { id: agentId },
      data: { status: "DEPLOYED" },
    });

    return NextResponse.json(deployment, { status: 201 });
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
