import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import { stripMarkdownJson } from "@/lib/ai/client";
import {
  QUALITY_SCORE_PROMPT,
  QualityScoreOutputSchema,
  type QualityScoreInput,
  type QualityScoreOutput,
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
    let scoreData: QualityScoreOutput;
    try {
      scoreData = QualityScoreOutputSchema.parse(JSON.parse(stripMarkdownJson(result)));
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid score format" },
        { status: 502 }
      );
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
