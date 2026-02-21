"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentSummaryCard } from "./agent-summary-card";
import { OverallProgress } from "./overall-progress";
import { RoundCard, type RoundCaseData } from "./round-card";
import { TEST_ROUNDS, type RoundNumber } from "@/lib/constants";
import type { AgentStatus } from "@/generated/prisma/client";

// === Types ===

interface TestCaseFromAPI {
  id: string;
  round: number;
  category: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  score: number | null;
  passed: boolean | null;
  reasoning: string | null;
}

interface RoundFromAPI {
  round: number;
  name: string;
  label: string;
  icon: string;
  count: number;
  passThreshold: number;
  minScore: number;
  cases: TestCaseFromAPI[];
  result: { score: number; passed: boolean; details: unknown } | null;
  stats: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    avgScore: number;
  };
}

export interface TestPipelineProps {
  agentId: string;
  agent: {
    name: string;
    archetype: string;
    status: AgentStatus;
    domain: { id: string; name: string };
  };
  initialRounds: RoundFromAPI[];
  allPassed: boolean;
}

type PipelinePhase = "idle" | "generating" | "running" | "complete";

// === Component ===

export function TestPipeline({
  agentId,
  agent,
  initialRounds,
  allPassed: initialAllPassed,
}: TestPipelineProps) {
  const [rounds, setRounds] = useState<RoundFromAPI[]>(initialRounds);
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [generatingRounds, setGeneratingRounds] = useState<Set<number>>(
    new Set()
  );
  const [runningRound, setRunningRound] = useState<number | null>(null);
  const [allPassed, setAllPassed] = useState(initialAllPassed);
  const abortRef = useRef<AbortController | null>(null);

  // Tính overall score
  const overallScore = (() => {
    const completed = rounds.filter((r) => r.result);
    if (completed.length === 0) return 0;
    return Math.round(
      completed.reduce((sum, r) => sum + (r.result?.score ?? 0), 0) /
        completed.length
    );
  })();

  // Tính total cost (placeholder — actual cost tracked server-side)
  const totalCost = 0;

  // Refresh dữ liệu từ API
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${agentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setRounds(data.rounds);
      setAllPassed(data.allPassed);
    } catch {
      // silent
    }
  }, [agentId]);

  // Generate test cases cho 1 round
  const handleGenerate = useCallback(
    async (round: number) => {
      setGeneratingRounds((prev) => new Set(prev).add(round));
      try {
        const res = await fetch("/api/ai/test-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, rounds: [round] }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Loi tao test cases");
        }

        toast.success(
          `Đã tạo test cases cho vòng ${round}`
        );
        await refreshData();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Lỗi tạo test cases"
        );
      } finally {
        setGeneratingRounds((prev) => {
          const next = new Set(prev);
          next.delete(round);
          return next;
        });
      }
    },
    [agentId, refreshData]
  );

  // Generate ALL rounds
  const handleGenerateAll = useCallback(async () => {
    setPhase("generating");
    try {
      const res = await fetch("/api/ai/test-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Lỗi tạo test cases");
      }

      const data = await res.json();
      toast.success(
        `Đã tạo ${data.count} test cases cho ${data.rounds} vòng`
      );
      await refreshData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Lỗi tạo test cases"
      );
    } finally {
      setPhase("idle");
    }
  }, [agentId, refreshData]);

  // Run single round via SSE
  const handleRunRound = useCallback(
    async (round: number) => {
      setRunningRound(round);
      setPhase("running");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch(`/api/tests/${agentId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Lỗi chạy test");
        }

        // SSE consume
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleSSEEvent(data);
                } catch {
                  // malformed JSON, skip
                }
              }
            }
          }
        }

        await refreshData();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(
          err instanceof Error ? err.message : "Lỗi chạy test"
        );
      } finally {
        setRunningRound(null);
        setPhase("idle");
        abortRef.current = null;
      }
    },
    [agentId, refreshData]
  );

  // Run ALL rounds via SSE
  const handleRunAll = useCallback(async () => {
    setPhase("running");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/tests/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Lỗi chạy test");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(data);
              } catch {
                // skip
              }
            }
          }
        }
      }

      await refreshData();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(
        err instanceof Error ? err.message : "Lỗi chạy test"
      );
    } finally {
      setPhase("idle");
      setRunningRound(null);
      abortRef.current = null;
    }
  }, [agentId, refreshData]);

  // Handle SSE events — update round status in real time
  function handleSSEEvent(data: Record<string, unknown>) {
    const type = data.type as string | undefined;

    if (type === "round_start") {
      setRunningRound(data.round as number);
    }

    if (data.testCaseId) {
      // case_complete — update specific case in state
      setRounds((prev) =>
        prev.map((r) => {
          if (r.round !== data.round) return r;
          return {
            ...r,
            cases: r.cases.map((c) =>
              c.id === data.testCaseId
                ? {
                    ...c,
                    score: data.score as number,
                    passed: data.passed as boolean,
                    reasoning: data.reasoning as string,
                  }
                : c
            ),
            stats: {
              ...r.stats,
              passed: r.cases.filter(
                (c) =>
                  c.passed === true ||
                  (c.id === data.testCaseId && data.passed === true)
              ).length,
            },
          };
        })
      );
    }

    if (type === "round_start" || (data.round && data.passed !== undefined && data.passRate !== undefined)) {
      // round_complete event
      if (data.passRate !== undefined) {
        toast.info(
          `Vòng ${data.round}: ${data.passed ? "PASSED" : "FAILED"} (${(data.score as number)?.toFixed(1)} điểm)`
        );
      }
    }
  }

  // Round statuses for OverallProgress
  const roundStatuses = rounds.map((r) => ({
    round: r.round,
    label: r.label,
    status: (runningRound === r.round
      ? "running"
      : r.result?.passed === true
        ? "passed"
        : r.result?.passed === false
          ? "failed"
          : "pending") as "passed" | "failed" | "running" | "pending",
  }));

  const hasCases = rounds.some((r) => r.cases.length > 0);
  const isGenerating = phase === "generating";
  const isRunning = phase === "running";

  return (
    <div className="space-y-4">
      <AgentSummaryCard
        agent={agent}
        overallScore={overallScore}
        totalCost={totalCost}
      />

      <OverallProgress
        rounds={roundStatuses}
        allPassed={allPassed}
        agentId={agentId}
      />

      {/* Global controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateAll}
          disabled={isGenerating || isRunning}
        >
          {isGenerating ? "Đang tạo..." : "Tạo tất cả test cases"}
        </Button>
        {hasCases && (
          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={isGenerating || isRunning}
          >
            {isRunning ? "Đang chạy..." : "Chạy tất cả (V1-V5)"}
          </Button>
        )}
      </div>

      {/* 6 Round Cards */}
      <div className="space-y-3">
        {rounds.map((r) => {
          const roundNum = r.round as RoundNumber;
          const roundConfig = TEST_ROUNDS[roundNum];

          const cases: RoundCaseData[] = r.cases.map((c) => ({
            id: c.id,
            input: c.input,
            expectedOutput: c.expectedOutput,
            actualOutput: c.actualOutput,
            score: c.score,
            passed: c.passed,
            reasoning: c.reasoning,
            category: c.category,
          }));

          const status: "passed" | "failed" | "running" | "pending" =
            runningRound === r.round
              ? "running"
              : r.result?.passed === true
                ? "passed"
                : r.result?.passed === false
                  ? "failed"
                  : "pending";

          return (
            <RoundCard
              key={r.round}
              round={r.round}
              name={roundConfig.name}
              label={roundConfig.label}
              icon={roundConfig.icon}
              status={status}
              cases={cases}
              stats={r.stats}
              isGenerating={generatingRounds.has(r.round)}
              isRunning={runningRound === r.round}
              onGenerate={() => handleGenerate(r.round)}
              onRun={() => handleRunRound(r.round)}
            />
          );
        })}
      </div>
    </div>
  );
}
