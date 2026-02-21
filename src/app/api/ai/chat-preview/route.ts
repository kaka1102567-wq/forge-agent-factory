import { NextResponse } from "next/server";
import { ChatPreviewRequestSchema } from "@/lib/schemas/agent-config";
import { sendMessage, classifyError } from "@/lib/ai/client";
import { MODEL_MAP, TIER_TIMEOUT, type ModelTier } from "@/lib/ai/router";
import { calculateCost, logRequest } from "@/lib/ai/cost";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = ChatPreviewRequestSchema.parse(body);

    const tier: ModelTier = data.config?.model ?? "sonnet";
    const temperature = data.config?.temperature ?? 0.7;
    const maxTokens = data.config?.maxTokens ?? 4096;

    const startTime = performance.now();

    const response = await sendMessage(
      {
        model: MODEL_MAP[tier],
        max_tokens: maxTokens,
        temperature,
        system: data.systemPrompt,
        messages: data.messages,
      },
      { timeoutMs: TIER_TIMEOUT[tier] }
    );

    const latencyMs = Math.round(performance.now() - startTime);
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = calculateCost(tier, inputTokens, outputTokens);

    const textContent = response.content.find((c) => c.type === "text");
    const message = textContent?.text ?? "";

    logRequest({
      model: tier,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date(),
      taskType: "chat_preview",
    });

    return NextResponse.json({
      message,
      meta: { modelUsed: tier, cost, latencyMs, inputTokens, outputTokens },
    });
  } catch (error) {
    const aiError = classifyError(error);
    const status = aiError.status ?? 500;
    return NextResponse.json(
      { error: aiError.message },
      { status: status >= 400 ? status : 500 }
    );
  }
}
