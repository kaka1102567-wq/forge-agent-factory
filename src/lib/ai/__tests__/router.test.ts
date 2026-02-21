import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getModelForTask,
  MODEL_MAP,
  TASK_ROUTING,
  FALLBACK_CHAIN,
  routeTask,
  type TaskType,
  type ModelTier,
} from "../router";
import { calculateCost, resetCostLog, getCostLog, PRICING } from "../cost";

// Mock sendMessage để không gọi API thật
vi.mock("../client", () => ({
  sendMessage: vi.fn(),
  classifyError: vi.fn((error: unknown) => error),
  anthropic: {},
  AIError: class AIError extends Error {
    type: string;
    status?: number;
    retryable: boolean;
    constructor(message: string, type: string, status?: number, retryable = false) {
      super(message);
      this.name = "AIError";
      this.type = type;
      this.status = status;
      this.retryable = retryable;
    }
  },
}));

import { sendMessage } from "../client";
const mockSendMessage = vi.mocked(sendMessage);

// Helper: tạo mock response từ Anthropic
function mockResponse(text: string, inputTokens = 100, outputTokens = 50) {
  return {
    content: [{ type: "text" as const, text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    model: "mock",
    id: "msg_test",
    type: "message" as const,
    role: "assistant" as const,
    stop_reason: "end_turn" as const,
    stop_sequence: null,
  };
}

describe("Router - Routing Rules", () => {
  it("routes classify, score, route, test_judge → haiku", () => {
    const haikuTasks: TaskType[] = ["classify", "score", "route", "test_judge"];
    for (const task of haikuTasks) {
      expect(getModelForTask(task)).toBe("haiku");
    }
  });

  it("routes generate, draft, analyze → sonnet", () => {
    const sonnetTasks: TaskType[] = ["generate", "draft", "analyze"];
    for (const task of sonnetTasks) {
      expect(getModelForTask(task)).toBe("sonnet");
    }
  });

  it("routes assemble, review → opus", () => {
    const opusTasks: TaskType[] = ["assemble", "review"];
    for (const task of opusTasks) {
      expect(getModelForTask(task)).toBe("opus");
    }
  });

  it("covers all TaskTypes in routing rules", () => {
    const allTasks: TaskType[] = [
      "classify", "score", "route", "test_judge",
      "generate", "draft", "analyze",
      "assemble", "review",
    ];
    for (const task of allTasks) {
      expect(TASK_ROUTING[task]).toBeDefined();
    }
  });

  it("uses correct model IDs", () => {
    // Claudible proxy format (OpenAI-compatible)
    expect(MODEL_MAP.haiku).toBe("claude-haiku-4.5");
    expect(MODEL_MAP.sonnet).toBe("claude-sonnet-4.6");
    expect(MODEL_MAP.opus).toBe("claude-opus-4.6");
  });
});

describe("Router - Fallback Chain", () => {
  it("opus falls back to sonnet", () => {
    expect(FALLBACK_CHAIN.opus).toBe("sonnet");
  });

  it("sonnet falls back to haiku", () => {
    expect(FALLBACK_CHAIN.sonnet).toBe("haiku");
  });

  it("haiku has no fallback", () => {
    expect(FALLBACK_CHAIN.haiku).toBeNull();
  });

  it("fallback chain covers all tiers", () => {
    const tiers: ModelTier[] = ["haiku", "sonnet", "opus"];
    for (const tier of tiers) {
      expect(FALLBACK_CHAIN).toHaveProperty(tier);
    }
  });
});

describe("Cost Calculator", () => {
  beforeEach(() => {
    resetCostLog();
  });

  it("calculates haiku cost correctly", () => {
    // 1000 input + 500 output tokens
    const cost = calculateCost("haiku", 1000, 500);
    const expected = (1000 / 1_000_000) * 0.25 + (500 / 1_000_000) * 1.25;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it("calculates sonnet cost correctly", () => {
    const cost = calculateCost("sonnet", 1000, 500);
    const expected = (1000 / 1_000_000) * 3 + (500 / 1_000_000) * 15;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it("calculates opus cost correctly", () => {
    const cost = calculateCost("opus", 1000, 500);
    const expected = (1000 / 1_000_000) * 15 + (500 / 1_000_000) * 75;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it("returns 0 for 0 tokens", () => {
    expect(calculateCost("haiku", 0, 0)).toBe(0);
  });

  it("handles large token counts", () => {
    // 1M input + 1M output
    const cost = calculateCost("sonnet", 1_000_000, 1_000_000);
    expect(cost).toBe(3 + 15); // $3 input + $15 output = $18
  });

  it("has correct pricing for all tiers", () => {
    expect(PRICING.haiku).toEqual({ input: 0.25, output: 1.25 });
    expect(PRICING.sonnet).toEqual({ input: 3, output: 15 });
    expect(PRICING.opus).toEqual({ input: 15, output: 75 });
  });
});

describe("Router - routeTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCostLog();
  });

  it("routes task and returns result", async () => {
    mockSendMessage.mockResolvedValueOnce(mockResponse("classified: sales") as never);

    const result = await routeTask("classify", "Classify this business");

    expect(result.result).toBe("classified: sales");
    expect(result.modelUsed).toBe("haiku");
    expect(result.cost).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
  });

  it("passes system prompt and maxTokens", async () => {
    mockSendMessage.mockResolvedValueOnce(mockResponse("result") as never);

    await routeTask("generate", "input", {
      system: "Be helpful",
      maxTokens: 2048,
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "Be helpful",
        max_tokens: 2048,
        model: MODEL_MAP.sonnet,
      }),
      expect.any(Object)
    );
  });

  it("uses tierOverride when provided", async () => {
    mockSendMessage.mockResolvedValueOnce(mockResponse("result") as never);

    const result = await routeTask("classify", "input", { tierOverride: "opus" });

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ model: MODEL_MAP.opus }),
      expect.any(Object)
    );
    expect(result.modelUsed).toBe("opus");
  });

  it("logs cost after successful request", async () => {
    mockSendMessage.mockResolvedValueOnce(mockResponse("result", 200, 100) as never);

    await routeTask("score", "Score this");

    const log = getCostLog();
    expect(log).toHaveLength(1);
    expect(log[0].model).toBe("haiku");
    expect(log[0].taskType).toBe("score");
    expect(log[0].inputTokens).toBe(200);
    expect(log[0].outputTokens).toBe(100);
  });

  it("falls back on 529 error", async () => {
    const error529 = Object.assign(new Error("Overloaded"), {
      name: "AIError",
      type: "overloaded",
      status: 529,
      retryable: true,
    });

    mockSendMessage
      .mockRejectedValueOnce(error529 as never)
      .mockResolvedValueOnce(mockResponse("fallback result") as never);

    const result = await routeTask("review", "Review this");

    // review → opus, fallback → sonnet
    expect(result.modelUsed).toBe("sonnet");
    expect(result.result).toBe("fallback result");
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  it("falls back on 500 error", async () => {
    const error500 = Object.assign(new Error("Server error"), {
      name: "AIError",
      type: "overloaded",
      status: 500,
      retryable: true,
    });

    mockSendMessage
      .mockRejectedValueOnce(error500 as never)
      .mockResolvedValueOnce(mockResponse("ok") as never);

    const result = await routeTask("assemble", "Assemble agent");

    expect(result.modelUsed).toBe("sonnet");
  });

  it("falls back through full chain opus → sonnet → haiku", async () => {
    const error529 = Object.assign(new Error("Overloaded"), {
      name: "AIError",
      type: "overloaded",
      status: 529,
      retryable: true,
    });

    mockSendMessage
      .mockRejectedValueOnce(error529 as never) // opus fails
      .mockRejectedValueOnce(error529 as never) // sonnet fails
      .mockResolvedValueOnce(mockResponse("haiku saves the day") as never);

    const result = await routeTask("review", "Review");

    expect(result.modelUsed).toBe("haiku");
    expect(mockSendMessage).toHaveBeenCalledTimes(3);
  });

  it("throws when haiku fails with no further fallback", async () => {
    const error529 = Object.assign(new Error("Overloaded"), {
      name: "AIError",
      type: "overloaded",
      status: 529,
      retryable: true,
    });

    mockSendMessage.mockRejectedValue(error529 as never);

    await expect(routeTask("classify", "input")).rejects.toThrow();
  });

  it("throws non-fallback errors immediately", async () => {
    const error400 = Object.assign(new Error("Bad request"), {
      name: "AIError",
      type: "invalid_request",
      status: 400,
      retryable: false,
    });

    mockSendMessage.mockRejectedValueOnce(error400 as never);

    await expect(routeTask("review", "input")).rejects.toThrow("Bad request");
    // Chỉ gọi 1 lần, không fallback
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
