import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { AgentConfigSchema } from "@/lib/schemas/agent-config";

const UpdateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  config: AgentConfigSchema.partial().optional(),
  status: z.enum(["DRAFT", "TESTING", "ACTIVE", "DISABLED"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUniqueOrThrow({
      where: { id },
      include: { domain: true },
    });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateAgentSchema.parse(body);

    // Merge config nếu có partial update
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.systemPrompt) updateData.systemPrompt = data.systemPrompt;
    if (data.status) updateData.status = data.status;

    if (data.config) {
      const current = await db.agent.findUniqueOrThrow({ where: { id } });
      const currentConfig =
        (current.config as Record<string, unknown>) ?? {};
      updateData.config = { ...currentConfig, ...data.config };
    }

    const agent = await db.agent.update({
      where: { id },
      data: updateData,
      include: { domain: true },
    });

    if (data.status) {
      logActivity("status_change", `Agent "${agent.name}" → ${data.status}`, {
        agentId: id,
        metadata: { newStatus: data.status },
      });
    }

    return NextResponse.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
