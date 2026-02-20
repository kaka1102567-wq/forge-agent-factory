import { NextResponse } from "next/server";
import { routeTask } from "@/lib/ai/router";
import {
  DOMAIN_CLASSIFY_PROMPT,
  DomainClassifyInputSchema,
} from "@/lib/ai/prompts/domain-classify";

// Phân loại domain/intent - dùng Haiku (nhanh, rẻ)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = DomainClassifyInputSchema.parse(body);

    const { result, modelUsed, cost, latencyMs } = await routeTask(
      DOMAIN_CLASSIFY_PROMPT.task,
      DOMAIN_CLASSIFY_PROMPT.buildUserMessage(input),
      {
        system: DOMAIN_CLASSIFY_PROMPT.system,
        maxTokens: DOMAIN_CLASSIFY_PROMPT.maxTokens,
      }
    );

    return NextResponse.json({
      classification: JSON.parse(result),
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
