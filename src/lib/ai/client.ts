import OpenAI from "openai";

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

// Phân loại lỗi từ OpenAI-compatible API
export function classifyError(error: unknown): AIError {
  if (error instanceof OpenAI.APIError) {
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
      status !== undefined && status >= 500
    );
  }

  const msg = error instanceof Error ? error.message : String(error);
  return new AIError(msg, "unknown", undefined, false);
}

// Singleton OpenAI client (trỏ tới proxy Claudible)
const globalForOpenAI = globalThis as unknown as {
  openaiClient: OpenAI | undefined;
};

export const openaiClient =
  globalForOpenAI.openaiClient ??
  new OpenAI({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL
      ? `${process.env.ANTHROPIC_BASE_URL}/v1`
      : "https://api.anthropic.com/v1",
  });

if (process.env.NODE_ENV !== "production")
  globalForOpenAI.openaiClient = openaiClient;

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

// Params format tương thích — giữ interface cũ cho router/cost không cần đổi
export interface SendMessageParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
}

// Response format tương thích — map từ OpenAI response sang Anthropic-like
export interface SendMessageResponse {
  content: Array<{ type: "text"; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Gửi message qua OpenAI-compatible proxy với retry + timeout.
 * Trả về response format tương thích Anthropic để router/cost không cần đổi.
 */
export async function sendMessage(
  params: SendMessageParams,
  options?: SendMessageOptions
): Promise<SendMessageResponse> {
  const timeoutMs = options?.timeoutMs ?? 30000;

  // Build OpenAI messages format: system message + user/assistant messages
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  for (const msg of params.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openaiClient.chat.completions.create(
        {
          model: params.model,
          max_tokens: params.max_tokens,
          messages,
          ...(params.temperature !== undefined
            ? { temperature: params.temperature }
            : {}),
        },
        { timeout: timeoutMs }
      );

      // Map OpenAI response → Anthropic-compatible format
      const text = response.choices[0]?.message?.content ?? "";
      const usage = response.usage;

      return {
        content: [{ type: "text", text }],
        usage: {
          input_tokens: usage?.prompt_tokens ?? 0,
          output_tokens: usage?.completion_tokens ?? 0,
        },
      };
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

/**
 * Strip markdown code block wrapper (```json ... ```) từ AI response.
 * Proxy qua OpenAI-compatible endpoint thường trả JSON bọc markdown.
 */
export function stripMarkdownJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    // Bỏ dòng đầu (```json hoặc ```) và dòng cuối (```)
    const lines = trimmed.split("\n");
    const start = lines[0].startsWith("```") ? 1 : 0;
    const end = lines[lines.length - 1].trim() === "```" ? lines.length - 1 : lines.length;
    return lines.slice(start, end).join("\n").trim();
  }
  return trimmed;
}
