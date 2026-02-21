import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CreateAgentSchema } from "@/lib/schemas/agent-config";

export async function GET() {
  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { domain: true },
  });
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreateAgentSchema.parse(body);

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

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
