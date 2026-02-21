import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { routeTask } from "@/lib/ai/router";
import { stripMarkdownJson } from "@/lib/ai/client";
import {
  AGENT_ASSEMBLE_PROMPT,
  AgentAssembleInputSchema,
  AgentAssembleOutputSchema,
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

    // Validate AI output
    const agent = AgentAssembleOutputSchema.parse(JSON.parse(stripMarkdownJson(result)));

    return NextResponse.json({
      agent,
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
