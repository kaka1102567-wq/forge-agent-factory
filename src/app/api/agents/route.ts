import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { CreateAgentSchema } from "@/lib/schemas/agent-config";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: { domain: true },
    });
    return NextResponse.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreateAgentSchema.parse(body);

    // Kiểm tra domain tồn tại
    const domain = await db.domain.findUnique({
      where: { id: data.domainId },
    });
    if (!domain) {
      return NextResponse.json(
        { error: "Domain không tồn tại" },
        { status: 404 }
      );
    }

    const agent = await db.agent.create({
      data: {
        name: data.name,
        domainId: data.domainId,
        archetype: data.archetype,
        systemPrompt: data.systemPrompt,
        config: data.config,
      },
      include: { domain: true },
    });

    logActivity("agent_create", `Tạo agent "${agent.name}" cho domain "${agent.domain.name}"`, {
      agentId: agent.id,
      metadata: { domainId: data.domainId, archetype: data.archetype },
    });

    return NextResponse.json(agent, { status: 201 });
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
