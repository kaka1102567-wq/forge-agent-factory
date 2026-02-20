import { NextResponse } from "next/server";
import { routeTask } from "@/lib/ai/router";
import {
  AGENT_ASSEMBLE_PROMPT,
  AgentAssembleInputSchema,
} from "@/lib/ai/prompts/agent-assemble";

// Lắp ráp agent - dùng Opus (cần reasoning mạnh)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = AgentAssembleInputSchema.parse(body);

    const { result, modelUsed, cost, latencyMs } = await routeTask(
      AGENT_ASSEMBLE_PROMPT.task,
      AGENT_ASSEMBLE_PROMPT.buildUserMessage(input),
      {
        system: AGENT_ASSEMBLE_PROMPT.system,
        maxTokens: AGENT_ASSEMBLE_PROMPT.maxTokens,
      }
    );

    return NextResponse.json({
      agent: JSON.parse(result),
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
