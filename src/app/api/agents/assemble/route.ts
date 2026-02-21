import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AssembleRequestSchema } from "@/lib/schemas/agent-config";
import { routeTask } from "@/lib/ai/router";
import {
  AGENT_ASSEMBLE_PROMPT,
  type AgentAssembleInput,
} from "@/lib/ai/prompts/agent-assemble";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = AssembleRequestSchema.parse(body);

    // Fetch domain + documents server-side
    const domain = await db.domain.findUnique({
      where: { id: data.domainId },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const documents = await db.document.findMany({
      where: {
        id: { in: data.documentIds },
        domainId: data.domainId,
      },
      include: { template: true },
    });

    // Validate tất cả docs thuộc domain
    if (documents.length !== data.documentIds.length) {
      return NextResponse.json(
        { error: "Một số document không thuộc domain này" },
        { status: 400 }
      );
    }

    // Auto-detect archetype từ domain.function nếu không truyền
    const archetype = data.archetype ?? domain.function;

    // Build input cho prompt
    const input: AgentAssembleInput = {
      domainName: domain.name,
      industry: domain.industry,
      function: domain.function,
      archetype,
      tone: domain.tone,
      channels: domain.channels,
      documents: documents.map((doc) => ({
        title: doc.title,
        category: doc.template?.category ?? "general",
        content: doc.content,
      })),
    };

    const userMessage = AGENT_ASSEMBLE_PROMPT.buildUserMessage(input);

    const result = await routeTask("assemble", userMessage, {
      system: AGENT_ASSEMBLE_PROMPT.system,
      maxTokens: AGENT_ASSEMBLE_PROMPT.maxTokens,
    });

    // Parse JSON response từ AI
    const parsed = JSON.parse(result.result);

    return NextResponse.json({
      agent: {
        systemPrompt: parsed.systemPrompt,
        config: parsed.config,
        capabilities: parsed.capabilities ?? [],
        limitations: parsed.limitations ?? [],
      },
      meta: {
        modelUsed: result.modelUsed,
        cost: result.cost,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    // JSON parse error từ AI response
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI response không phải JSON hợp lệ. Vui lòng thử lại." },
        { status: 502 }
      );
    }
    const message = error instanceof Error ? error.message : "Assembly failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
