import { z } from "zod/v4";
import { db } from "@/lib/db";
import {
  executeTestCase,
  type AgentData,
  type DomainContext,
  type TestCaseData,
} from "@/lib/ai/test-runner";
import { TEST_ROUNDS, type RoundNumber } from "@/lib/constants";

const RunRequestSchema = z.object({
  round: z.number().min(1).max(6).optional(),
});

// SSE stream để chạy test cases real-time
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  let round: number | undefined;
  try {
    const body = await request.json();
    const parsed = RunRequestSchema.parse(body);
    round = parsed.round;
  } catch {
    // body rỗng hoặc không có round = run all rounds 1-5
  }

  // Fetch agent + domain
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: { domain: true },
  });

  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse agent config
  const agentConfig = agent.config as Record<string, unknown>;
  const agentData: AgentData = {
    id: agent.id,
    name: agent.name,
    archetype: agent.archetype,
    systemPrompt: agent.systemPrompt,
    config: {
      temperature: (agentConfig?.temperature as number) ?? 0.7,
      maxTokens: (agentConfig?.maxTokens as number) ?? 2048,
    },
  };

  const domainCtx: DomainContext = {
    name: agent.domain.name,
    industry: agent.domain.industry,
    function: agent.domain.function,
    tone: agent.domain.tone,
  };

  // Xác định rounds cần chạy
  const roundsToRun = round ? [round] : [1, 2, 3, 4, 5];

  // Fetch test cases
  const testCases = await db.testCase.findMany({
    where: { agentId, round: { in: roundsToRun } },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  if (testCases.length === 0) {
    return new Response(
      JSON.stringify({ error: "Chưa có test cases. Hãy generate trước." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Update agent status → TESTING
  await db.agent.update({
    where: { id: agentId },
    data: { status: "TESTING" },
  });

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const totalCases = testCases.length;
        let completedCases = 0;

        // Group by round
        const casesByRound = new Map<number, typeof testCases>();
        for (const tc of testCases) {
          const existing = casesByRound.get(tc.round) ?? [];
          existing.push(tc);
          casesByRound.set(tc.round, existing);
        }

        send("progress", {
          type: "start",
          totalRounds: casesByRound.size,
          totalCases,
        });

        // Chạy từng round tuần tự
        for (const roundNum of roundsToRun) {
          const cases = casesByRound.get(roundNum);
          if (!cases || cases.length === 0) continue;

          const roundKey = roundNum as RoundNumber;
          const roundConfig = TEST_ROUNDS[roundKey];

          send("progress", {
            type: "round_start",
            round: roundNum,
            name: roundConfig.name,
            label: roundConfig.label,
            caseCount: cases.length,
          });

          const roundResults: Array<{
            score: number;
            passed: boolean;
          }> = [];

          // Chạy từng case tuần tự
          for (const tc of cases) {
            const testCaseData: TestCaseData = {
              id: tc.id,
              round: tc.round,
              category: tc.category,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
            };

            try {
              const result = await executeTestCase(
                testCaseData,
                agentData,
                domainCtx
              );

              // Persist kết quả vào DB
              await db.testCase.update({
                where: { id: tc.id },
                data: {
                  actualOutput: result.actualOutput,
                  score: result.score,
                  passed: result.passed,
                  reasoning: result.reasoning,
                },
              });

              roundResults.push({
                score: result.score,
                passed: result.passed,
              });

              completedCases++;

              send("case_complete", {
                testCaseId: tc.id,
                round: roundNum,
                score: result.score,
                passed: result.passed,
                reasoning: result.reasoning,
                latencyMs: result.latencyMs,
                completedCases,
                totalCases,
              });
            } catch (err) {
              // Case bị lỗi → fail
              await db.testCase.update({
                where: { id: tc.id },
                data: {
                  score: 0,
                  passed: false,
                  reasoning:
                    err instanceof Error
                      ? `Lỗi: ${err.message}`
                      : "Lỗi không xác định",
                },
              });

              roundResults.push({ score: 0, passed: false });
              completedCases++;

              send("case_complete", {
                testCaseId: tc.id,
                round: roundNum,
                score: 0,
                passed: false,
                reasoning: "Lỗi khi chạy test case",
                completedCases,
                totalCases,
              });
            }
          }

          // Tính kết quả round
          const passedCases = roundResults.filter((r) => r.passed).length;
          const avgScore =
            roundResults.reduce((s, r) => s + r.score, 0) /
            roundResults.length;
          const passRate = (passedCases / roundResults.length) * 100;
          const roundPassed = passRate >= roundConfig.passThreshold;

          // Upsert TestResult
          const existing = await db.testResult.findFirst({
            where: { agentId, round: roundNum },
          });

          const resultData = {
            score: Math.round(avgScore * 100) / 100,
            passed: roundPassed,
            details: {
              totalCases: roundResults.length,
              passedCases,
              failedCases: roundResults.length - passedCases,
              passRate,
              avgScore: Math.round(avgScore * 100) / 100,
            },
          };

          if (existing) {
            await db.testResult.update({
              where: { id: existing.id },
              data: resultData,
            });
          } else {
            await db.testResult.create({
              data: { agentId, round: roundNum, ...resultData },
            });
          }

          send("round_complete", {
            round: roundNum,
            name: roundConfig.name,
            passed: roundPassed,
            score: Math.round(avgScore * 100) / 100,
            passedCases,
            totalCases: roundResults.length,
            passRate,
          });

          // Nếu round fail và không phải run single → dừng pipeline
          if (!roundPassed && !round) {
            send("complete", {
              status: "failed",
              failedAt: roundNum,
              message: `Dừng tại vòng ${roundNum} (${roundConfig.label}): không đạt ngưỡng ${roundConfig.passThreshold}%`,
            });
            controller.close();
            return;
          }
        }

        // Tất cả rounds passed
        send("complete", {
          status: "passed",
          message: "Tất cả vòng test đã hoàn thành",
        });
      } catch (error) {
        send("error", {
          message:
            error instanceof Error ? error.message : "Lỗi không xác định",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
