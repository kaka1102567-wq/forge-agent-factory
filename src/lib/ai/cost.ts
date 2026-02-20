import type { ModelTier } from "./router";

// Giá theo USD per 1M tokens (tháng 2/2026)
const PRICING: Record<ModelTier, { input: number; output: number }> = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 15, output: 75 },
};

export interface CostEntry {
  model: ModelTier;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
  taskType: string;
}

// In-memory log cho development — production sẽ dùng DB
const costLog: CostEntry[] = [];

/**
 * Tính chi phí từ token usage
 */
export function calculateCost(
  model: ModelTier,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Ghi log request vào in-memory store
 */
export function logRequest(entry: CostEntry): void {
  costLog.push(entry);

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Cost] ${entry.taskType} via ${entry.model}: ${entry.inputTokens}in + ${entry.outputTokens}out = $${entry.cost.toFixed(6)}`
    );
  }
}

/**
 * Lấy tổng chi phí trong ngày
 */
export function getDailyCost(date?: Date): number {
  const target = date ?? new Date();
  const dayStart = new Date(target);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(target);
  dayEnd.setHours(23, 59, 59, 999);

  return costLog
    .filter((e) => e.timestamp >= dayStart && e.timestamp <= dayEnd)
    .reduce((sum, e) => sum + e.cost, 0);
}

/**
 * Lấy toàn bộ log (cho debug/testing)
 */
export function getCostLog(): readonly CostEntry[] {
  return costLog;
}

/**
 * Reset log (cho testing)
 */
export function resetCostLog(): void {
  costLog.length = 0;
}

export { PRICING };
