import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import {
  QUALITY_SCORE_PROMPT,
  QualityScoreOutputSchema,
  type QualityScoreInput,
} from "@/lib/ai/prompts/quality-score";

const ScoreRequestSchema = z.object({
  documentId: z.string().min(1),
});

// Chấm điểm chất lượng document — dùng Haiku
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId } = ScoreRequestSchema.parse(body);

    // Fetch document + domain
    const document = await db.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { domain: true, template: true },
    });

    // Build input cho AI scoring
    const scoreInput: QualityScoreInput = {
      documentContent: document.content,
      documentCategory: document.template?.category ?? "general",
      domainContext: `${document.domain.name} - ${document.domain.industry} / ${document.domain.function} (${document.domain.tone})`,
    };

    // Gọi AI score
    const { result, modelUsed, cost, latencyMs } = await routeTask(
      QUALITY_SCORE_PROMPT.task,
      QUALITY_SCORE_PROMPT.buildUserMessage(scoreInput),
      {
        system: QUALITY_SCORE_PROMPT.system,
        maxTokens: QUALITY_SCORE_PROMPT.maxTokens,
      }
    );

    // Parse + validate output
    const parsed = JSON.parse(result);
    const scoreData = QualityScoreOutputSchema.parse(parsed);

    // Update document với score mới
    await db.document.update({
      where: { id: documentId },
      data: {
        qualityScore: scoreData.score,
        qualityDetail: scoreData,
      },
    });

    return NextResponse.json({
      ...scoreData,
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
