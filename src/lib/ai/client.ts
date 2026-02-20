import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

// Error types cho AI requests
export type AIErrorType =
  | "rate_limit"
  | "overloaded"
  | "invalid_request"
  | "auth"
  | "unknown";

export class AIError extends Error {
  constructor(
    message: string,
    public type: AIErrorType,
    public status?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "AIError";
  }
}

// Phân loại lỗi từ Anthropic API
export function classifyError(error: unknown): AIError {
  if (error instanceof Anthropic.APIError) {
    const status = error.status;

    if (status === 429) {
      return new AIError(error.message, "rate_limit", status, true);
    }
    if (status === 529 || status === 500 || status === 503) {
      return new AIError(error.message, "overloaded", status, true);
    }
    if (status === 400) {
      return new AIError(error.message, "invalid_request", status, false);
    }
    if (status === 401 || status === 403) {
      return new AIError(error.message, "auth", status, false);
    }

    return new AIError(
      error.message,
      "unknown",
      status,
      status >= 500
    );
  }

  const msg = error instanceof Error ? error.message : String(error);
  return new AIError(msg, "unknown", undefined, false);
}

// Singleton Anthropic client
const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production")
  globalForAnthropic.anthropic = anthropic;

// Retry config
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SendMessageOptions {
  /** Timeout in ms. Default 30000, Opus gets 60000 */
  timeoutMs?: number;
}

/**
 * Gửi message tới Anthropic API với retry + timeout.
 * Trả về raw response để caller xử lý.
 */
export async function sendMessage(
  params: MessageCreateParamsNonStreaming,
  options?: SendMessageOptions
) {
  const timeoutMs = options?.timeoutMs ?? 30000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create(params, {
        timeout: timeoutMs,
      });
      return response;
    } catch (error) {
      const aiError = classifyError(error);

      // Không retry nếu lỗi không retryable hoặc đã hết attempts
      if (!aiError.retryable || attempt === MAX_RETRIES) {
        throw aiError;
      }

      const delay = getRetryDelay(attempt);
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[AI Client] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms - ${aiError.type}: ${aiError.message}`
        );
      }

      await sleep(delay);
    }
  }

  // Unreachable, nhưng TypeScript cần
  throw new AIError("Max retries exceeded", "unknown", undefined, false);
}
