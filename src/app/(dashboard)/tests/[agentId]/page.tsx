export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { TEST_ROUNDS } from "@/lib/constants";
import { TestPipeline } from "@/components/features/test-pipeline/test-pipeline";

export default async function TestAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: { domain: true },
  });

  if (!agent) notFound();

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

  // Build round data
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
      cases: cases.map((c) => ({
        id: c.id,
        round: c.round,
        category: c.category,
        input: c.input,
        expectedOutput: c.expectedOutput,
        actualOutput: c.actualOutput,
        score: c.score,
        passed: c.passed,
        reasoning: c.reasoning,
      })),
      result: result
        ? {
            score: result.score,
            passed: result.passed,
            details: result.details,
          }
        : null,
      stats: {
        total: cases.length,
        passed: passedCases,
        failed: failedCases,
        pending: cases.length - passedCases - failedCases,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    };
  });

  const allPassed =
    testResults.length === 6 && testResults.every((r) => r.passed);

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tests">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Quay lai
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold">Test Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          6 vong test danh gia agent truoc khi deploy.
        </p>
      </div>

      <TestPipeline
        agentId={agentId}
        agent={{
          name: agent.name,
          archetype: agent.archetype,
          status: agent.status,
          domain: { id: agent.domain.id, name: agent.domain.name },
        }}
        initialRounds={roundsData}
        allPassed={allPassed}
      />
    </div>
  );
}
