import { anthropic } from "./client";

// Model routing: chọn model phù hợp theo task complexity
type ModelTier = "fast" | "balanced" | "powerful";

const MODEL_MAP: Record<ModelTier, string> = {
  fast: "claude-haiku-4-5-20251001",    // Classification, scoring, simple tasks
  balanced: "claude-sonnet-4-6-20250514", // Generation, assembly, most tasks
  powerful: "claude-opus-4-6-20250514",   // Complex reasoning, quality review
};

interface RouteOptions {
  tier: ModelTier;
  system?: string;
  maxTokens?: number;
}

export async function routeAI(prompt: string, options: RouteOptions) {
  const { tier, system, maxTokens = 4096 } = options;

  const response = await anthropic.messages.create({
    model: MODEL_MAP[tier],
    max_tokens: maxTokens,
    system: system ?? "",
    messages: [{ role: "user", content: prompt }],
  });

  return response;
}

export { MODEL_MAP };
