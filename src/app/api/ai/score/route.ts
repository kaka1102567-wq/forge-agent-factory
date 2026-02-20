import { NextResponse } from "next/server";
import { routeTask } from "@/lib/ai/router";
import {
  QUALITY_SCORE_PROMPT,
  QualityScoreInputSchema,
} from "@/lib/ai/prompts/quality-score";

// Chấm điểm chất lượng - dùng Haiku (nhanh, cost-effective)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = QualityScoreInputSchema.parse(body);

    const { result, modelUsed, cost, latencyMs } = await routeTask(
      QUALITY_SCORE_PROMPT.task,
      QUALITY_SCORE_PROMPT.buildUserMessage(input),
      {
        system: QUALITY_SCORE_PROMPT.system,
        maxTokens: QUALITY_SCORE_PROMPT.maxTokens,
      }
    );

    return NextResponse.json({
      ...JSON.parse(result),
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
