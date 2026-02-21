import { sendMessage, classifyError, AIError } from "./client";
import { calculateCost, logRequest } from "./cost";
import { db } from "@/lib/db";

// === Types ===

export type ModelTier = "haiku" | "sonnet" | "opus";

export type TaskType =
  | "classify"
  | "score"
  | "route"
  | "generate"
  | "draft"
  | "analyze"
  | "assemble"
  | "review"
  | "test_judge";

// Model IDs — Claudible proxy format
export const MODEL_MAP: Record<ModelTier, string> = {
  haiku: "claude-haiku-4.5",
  sonnet: "claude-sonnet-4.6",
  opus: "claude-opus-4.6",
};

// Routing rules: task → model tier phù hợp
const TASK_ROUTING: Record<TaskType, ModelTier> = {
  classify: "haiku",
  score: "haiku",
  route: "haiku",
  test_judge: "haiku",
  generate: "sonnet",
  draft: "sonnet",
  analyze: "sonnet",
  assemble: "opus",
  review: "opus",
};

// Fallback chain khi model bị lỗi 529/500
const FALLBACK_CHAIN: Record<ModelTier, ModelTier | null> = {
  opus: "sonnet",
  sonnet: "haiku",
  haiku: null,
};

// Timeout theo tier (Opus/Sonnet cần nhiều thời gian hơn qua proxy)
const TIER_TIMEOUT: Record<ModelTier, number> = {
  haiku: 30_000,
  sonnet: 60_000,
  opus: 90_000,
};

// === Interfaces ===

export interface RouteTaskOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Override tier thay vì dùng routing rules */
  tierOverride?: ModelTier;
  /** Agent ID để ghi CostLog vào DB */
  agentId?: string;
}

export interface RouteTaskResult {
  result: string;
  modelUsed: ModelTier;
  cost: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

// === Core Router ===

/**
 * Xác định model tier cho task type
 */
export function getModelForTask(task: TaskType): ModelTier {
  return TASK_ROUTING[task];
}

/**
 * Kiểm tra lỗi có nên fallback không (529 overloaded, 500 server error)
 */
function shouldFallback(error: AIError): boolean {
  return error.status === 529 || error.status === 500;
}

/**
 * Route một task tới model phù hợp, tự động fallback khi cần.
 *
 * Flow: Xác định tier → gọi API → nếu 529/500 thì fallback xuống tier thấp hơn
 */
export async function routeTask(
  task: TaskType,
  input: string,
  options?: RouteTaskOptions
): Promise<RouteTaskResult> {
  const { system, maxTokens = 4096, temperature, tierOverride, agentId } = options ?? {};

  let currentTier = tierOverride ?? getModelForTask(task);

  // Thử gọi model, fallback nếu bị overloaded
  while (true) {
    const startTime = performance.now();

    try {
      const response = await sendMessage(
        {
          model: MODEL_MAP[currentTier],
          max_tokens: maxTokens,
          system: system ?? undefined,
          messages: [{ role: "user", content: input }],
          ...(temperature !== undefined ? { temperature } : {}),
        },
        { timeoutMs: TIER_TIMEOUT[currentTier] }
      );

      const latencyMs = Math.round(performance.now() - startTime);
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cost = calculateCost(currentTier, inputTokens, outputTokens);

      // Trích xuất text từ response
      const textContent = response.content.find((c) => c.type === "text");
      const result = textContent?.text ?? "";

      // Log chi phí (in-memory)
      logRequest({
        model: currentTier,
        inputTokens,
        outputTokens,
        cost,
        timestamp: new Date(),
        taskType: task,
      });

      // Lưu CostLog vào DB (fire-and-forget, không block response)
      db.costLog
        .create({
          data: {
            agentId: agentId ?? null,
            model: currentTier,
            task,
            inputTokens,
            outputTokens,
            cost,
          },
        })
        .catch((err: unknown) => {
          console.error("[CostLog] Failed to save:", err);
        });

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Router] ${task} → ${currentTier} (${MODEL_MAP[currentTier]}) | ${latencyMs}ms | $${cost.toFixed(6)}`
        );
      }

      return { result, modelUsed: currentTier, cost, latencyMs, inputTokens, outputTokens };
    } catch (error) {
      const aiError =
        error instanceof AIError
          ? error
          : classifyError(error);

      // Thử fallback nếu lỗi 529/500
      if (shouldFallback(aiError)) {
        const fallback = FALLBACK_CHAIN[currentTier];
        if (fallback) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[Router] Fallback: ${currentTier} → ${fallback} (${aiError.type}: ${aiError.status})`
            );
          }
          currentTier = fallback;
          continue;
        }
      }

      // Không thể fallback thêm → throw
      throw aiError;
    }
  }
}

export { TASK_ROUTING, FALLBACK_CHAIN, TIER_TIMEOUT };
