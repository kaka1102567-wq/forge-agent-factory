import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TEST_ROUNDS } from "@/lib/constants";
import { withRole } from "@/lib/auth/helpers";

// Lấy test data cho agent: test cases (grouped by round) + test results
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  const { agentId } = await params;

  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: { domain: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [testCases, testResults] = await Promise.all([
    db.testCase.findMany({
      where: { agentId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    }),
    db.testResult.findMany({
      where: { agentId },
      orderBy: { round: "asc" },
    }),
  ]);

  // Group test cases by round
  const roundsData = Object.entries(TEST_ROUNDS).map(([roundNum, config]) => {
    const round = Number(roundNum);
    const cases = testCases.filter((tc) => tc.round === round);
    const result = testResults.find((tr) => tr.round === round);
    const passedCases = cases.filter((tc) => tc.passed === true).length;
    const failedCases = cases.filter((tc) => tc.passed === false).length;
    const avgScore =
      cases.length > 0
        ? cases.reduce((sum, tc) => sum + (tc.score ?? 0), 0) / cases.length
        : 0;

    return {
      round,
      ...config,
      cases,
      result,
      stats: {
        total: cases.length,
        passed: passedCases,
        failed: failedCases,
        pending: cases.length - passedCases - failedCases,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    };
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      archetype: agent.archetype,
      status: agent.status,
      domain: { id: agent.domain.id, name: agent.domain.name },
    },
    rounds: roundsData,
    totalResults: testResults.length,
    allPassed: testResults.length === 6 && testResults.every((r) => r.passed),
  });
}
