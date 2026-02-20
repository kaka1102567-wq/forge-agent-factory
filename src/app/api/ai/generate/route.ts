import { NextResponse } from "next/server";
import { routeTask } from "@/lib/ai/router";
import {
  DOC_GENERATE_PROMPT,
  DocGenerateInputSchema,
} from "@/lib/ai/prompts/doc-generate";

// Sinh nội dung tài liệu - dùng Sonnet (cân bằng chất lượng/tốc độ)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = DocGenerateInputSchema.parse(body);

    const { result, modelUsed, cost, latencyMs } = await routeTask(
      DOC_GENERATE_PROMPT.task,
      DOC_GENERATE_PROMPT.buildUserMessage(input),
      {
        system: DOC_GENERATE_PROMPT.system,
        maxTokens: DOC_GENERATE_PROMPT.maxTokens,
      }
    );

    return NextResponse.json({
      document: JSON.parse(result),
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
