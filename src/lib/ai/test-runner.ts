import { routeTask, type RouteTaskResult } from "./router";
import { stripMarkdownJson } from "./client";
import { TEST_JUDGE_PROMPT, TestJudgeOutputSchema } from "./prompts/test-judge";
import { TEST_ROUNDS, type RoundNumber } from "@/lib/constants";

// === Types ===

export interface TestCaseData {
  id: string;
  round: number;
  category: string;
  input: string;
  expectedOutput: string;
}

export interface AgentData {
  id: string;
  name: string;
  archetype: string;
  systemPrompt: string;
  config: { temperature?: number; maxTokens?: number };
}

export interface DomainContext {
  name: string;
  industry: string;
  function: string;
  tone: string;
}

export interface TestCaseResult {
  testCaseId: string;
  actualOutput: string;
  score: number;
  passed: boolean;
  reasoning: string;
  latencyMs: number;
  cost: number;
}

export interface RoundResult {
  round: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  avgScore: number;
  passed: boolean;
  totalCost: number;
  totalLatencyMs: number;
  results: TestCaseResult[];
}

// === Core Functions ===

/**
 * Gửi test input tới agent, thu actualOutput.
 * Dùng system prompt + config của agent.
 */
async function getAgentResponse(
  testInput: string,
  agent: AgentData
): Promise<RouteTaskResult> {
  return routeTask("generate", testInput, {
    system: agent.systemPrompt,
    maxTokens: agent.config.maxTokens ?? 2048,
    temperature: agent.config.temperature ?? 0.7,
    // Agent response dùng tier sonnet (mô phỏng production)
    tierOverride: "sonnet",
  });
}

/**
 * Judge đánh giá response từ agent.
 */
async function judgeResponse(
  testCase: TestCaseData,
  actualOutput: string,
  agent: AgentData,
  domain: DomainContext
): Promise<{ score: number; passed: boolean; reasoning: string; judgeCost: number }> {
  const judgeInput = TEST_JUDGE_PROMPT.buildUserMessage({
    round: testCase.round,
    category: testCase.category,
    userInput: testCase.input,
    expectedBehavior: testCase.expectedOutput,
    actualResponse: actualOutput,
    agentContext: `${agent.name} (${agent.archetype}) - ${domain.name} (${domain.industry}/${domain.function}) - Giọng: ${domain.tone}`,
  });

  const judgeResult = await routeTask(TEST_JUDGE_PROMPT.task, judgeInput, {
    system: TEST_JUDGE_PROMPT.system,
    maxTokens: TEST_JUDGE_PROMPT.maxTokens,
  });

  try {
    // Thử parse JSON — fallback extract JSON object từ text
    let jsonText = stripMarkdownJson(judgeResult.result);
    try {
      JSON.parse(jsonText);
    } catch {
      // Tìm JSON object trong text (judge đôi khi trả text trước/sau JSON)
      const match = judgeResult.result.match(/\{[\s\S]*"score"[\s\S]*"reasoning"[\s\S]*\}/);
      if (match) jsonText = match[0];
    }

    const parsed = TestJudgeOutputSchema.parse(JSON.parse(jsonText));

    // Round 4 safety: nếu safety score thấp → force fail
    const round = testCase.round as RoundNumber;
    const threshold = TEST_ROUNDS[round].minScore;
    const passed = parsed.score >= threshold && parsed.passed;

    return {
      score: parsed.score,
      passed,
      reasoning: parsed.reasoning,
      judgeCost: judgeResult.cost,
    };
  } catch {
    // Nếu judge output không parse được → fail case
    if (process.env.NODE_ENV === "development") {
      console.warn("[Judge] Parse error, raw:", judgeResult.result.slice(0, 300));
    }
    return {
      score: 0,
      passed: false,
      reasoning: "Lỗi parse kết quả đánh giá từ AI judge",
      judgeCost: judgeResult.cost,
    };
  }
}

/**
 * Chạy một test case: gửi input → agent response → judge đánh giá.
 */
export async function executeTestCase(
  testCase: TestCaseData,
  agent: AgentData,
  domain: DomainContext
): Promise<TestCaseResult> {
  const startTime = performance.now();

  // Bước 1: Agent trả lời
  const agentResponse = await getAgentResponse(testCase.input, agent);
  const actualOutput = agentResponse.result;

  // Bước 2: Judge đánh giá
  const { score, passed, reasoning, judgeCost } = await judgeResponse(
    testCase,
    actualOutput,
    agent,
    domain
  );

  const latencyMs = Math.round(performance.now() - startTime);
  const totalCost = agentResponse.cost + judgeCost;

  return {
    testCaseId: testCase.id,
    actualOutput,
    score,
    passed,
    reasoning,
    latencyMs,
    cost: totalCost,
  };
}

/**
 * Chạy toàn bộ test cases trong một round, tuần tự để tránh rate limit.
 */
export async function executeRound(
  testCases: TestCaseData[],
  agent: AgentData,
  domain: DomainContext,
  onProgress?: (completed: number, total: number, result: TestCaseResult) => void
): Promise<RoundResult> {
  if (testCases.length === 0) {
    throw new Error("Không có test case để chạy");
  }

  const round = testCases[0].round as RoundNumber;
  const roundConfig = TEST_ROUNDS[round];
  const results: TestCaseResult[] = [];

  // Chạy tuần tự từng case
  for (let i = 0; i < testCases.length; i++) {
    const result = await executeTestCase(testCases[i], agent, domain);
    results.push(result);
    onProgress?.(i + 1, testCases.length, result);
  }

  // Tính aggregate
  const passedCases = results.filter((r) => r.passed).length;
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const passRate = (passedCases / results.length) * 100;
  const roundPassed = passRate >= roundConfig.passThreshold;

  return {
    round,
    totalCases: results.length,
    passedCases,
    failedCases: results.length - passedCases,
    avgScore: Math.round(avgScore * 100) / 100,
    passed: roundPassed,
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
    totalLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
    results,
  };
}
