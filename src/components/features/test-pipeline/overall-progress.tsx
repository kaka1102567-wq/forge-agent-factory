"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RoundStatus {
  round: number;
  label: string;
  status: "passed" | "failed" | "running" | "pending";
}

interface OverallProgressProps {
  rounds: RoundStatus[];
  allPassed: boolean;
  agentId: string;
}

const STATUS_COLORS: Record<RoundStatus["status"], string> = {
  passed: "bg-emerald-500",
  failed: "bg-red-500",
  running: "bg-yellow-500 animate-pulse",
  pending: "bg-muted",
};

export function OverallProgress({
  rounds,
  allPassed,
  agentId,
}: OverallProgressProps) {
  const passedCount = rounds.filter((r) => r.status === "passed").length;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium">
            {passedCount}/6 vong passed
          </span>
          {allPassed && (
            <span className="text-sm font-medium text-emerald-600">
              San sang deploy
            </span>
          )}
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {rounds.map((r) => (
            <div
              key={r.round}
              className={`flex-1 ${STATUS_COLORS[r.status]} transition-all`}
              title={`V${r.round}: ${r.label} — ${r.status}`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between">
          {rounds.map((r) => (
            <span key={r.round} className="text-[10px] text-muted-foreground">
              V{r.round}
            </span>
          ))}
        </div>
      </div>
      <Button asChild disabled={!allPassed} size="sm">
        <Link href={allPassed ? `/deploy?agentId=${agentId}` : "#"}>
          Deploy
        </Link>
      </Button>
    </div>
  );
}
