import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { routeTask } from "@/lib/ai/router";
import { stripMarkdownJson } from "@/lib/ai/client";
import {
  DOMAIN_CLASSIFY_PROMPT,
  DomainClassifyInputSchema,
  DomainClassifyOutputSchema,
} from "@/lib/ai/prompts/domain-classify";
import { withRole } from "@/lib/auth/helpers";

// Phân loại domain/intent - dùng Haiku (nhanh, rẻ)
export async function POST(request: Request) {
  const authResult = await withRole(["ADMIN", "EDITOR"]);
  if (authResult instanceof NextResponse) return authResult;

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

    // Validate AI output
    const classification = DomainClassifyOutputSchema.parse(JSON.parse(stripMarkdownJson(result)));

    return NextResponse.json({
      classification,
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
