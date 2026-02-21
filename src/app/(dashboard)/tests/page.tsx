export const dynamic = "force-dynamic";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { AgentStatus } from "@/generated/prisma/client";

const STATUS_VARIANT: Record<AgentStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  TESTING: "secondary",
  ACTIVE: "default",
  DISABLED: "secondary",
};

export default async function TestsPage() {
  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      domain: true,
      testResults: { orderBy: { round: "asc" } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Tests</h2>
        <p className="text-sm text-muted-foreground">
          Chay test va xem ket qua danh gia agent.
        </p>
      </div>

      {agents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Domain</th>
                <th className="px-4 py-3 text-center font-medium">
                  Tien do
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Trang thai
                </th>
                <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
                  Test gan nhat
                </th>
                <th className="px-4 py-3 text-right font-medium">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const passedRounds = agent.testResults.filter(
                  (r) => r.passed
                ).length;
                const totalRounds = agent.testResults.length;
                const lastTest =
                  agent.testResults.length > 0
                    ? agent.testResults[agent.testResults.length - 1]
                    : null;

                return (
                  <tr
                    key={agent.id}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <Link
                          href={`/tests/${agent.id}`}
                          className="font-medium hover:underline"
                        >
                          {agent.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {agent.archetype}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {agent.domain.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Mini progress dots */}
                        {[1, 2, 3, 4, 5, 6].map((round) => {
                          const result = agent.testResults.find(
                            (r) => r.round === round
                          );
                          return (
                            <div
                              key={round}
                              className={`h-2 w-2 rounded-full ${
                                result?.passed
                                  ? "bg-emerald-500"
                                  : result
                                    ? "bg-red-500"
                                    : "bg-muted-foreground/30"
                              }`}
                              title={`V${round}: ${result?.passed ? "Pass" : result ? "Fail" : "Chua test"}`}
                            />
                          );
                        })}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {passedRounds}/{totalRounds > 0 ? totalRounds : 6}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_VARIANT[agent.status]}>
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {lastTest
                        ? new Date(lastTest.createdAt).toLocaleDateString(
                            "vi-VN"
                          )
                        : "Chua test"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="xs" variant="outline" asChild>
                        <Link href={`/tests/${agent.id}`}>Chay test</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Chua co agent nao</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Tao agent truoc de bat dau test.
          </p>
          <Button asChild>
            <Link href="/agents">Di toi Agents</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
