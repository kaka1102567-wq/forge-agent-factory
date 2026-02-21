"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Shield,
  Gauge,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestCaseList } from "./test-case-list";

// Map icon name → component
const ICONS: Record<string, React.ElementType> = {
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Shield,
  Gauge,
  Users,
};

export interface RoundCaseData {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  score: number | null;
  passed: boolean | null;
  reasoning: string | null;
  category: string;
}

export interface RoundCardProps {
  round: number;
  name: string;
  label: string;
  icon: string;
  status: "passed" | "failed" | "running" | "pending";
  cases: RoundCaseData[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    avgScore: number;
  };
  isGenerating: boolean;
  isRunning: boolean;
  onGenerate: () => void;
  onRun: () => void;
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  passed: { label: "Passed", variant: "default" },
  failed: { label: "Failed", variant: "secondary" },
  running: { label: "Đang chạy...", variant: "outline" },
  pending: { label: "Chờ", variant: "outline" },
};

export function RoundCard({
  round,
  name,
  label,
  icon,
  status,
  cases,
  stats,
  isGenerating,
  isRunning,
  onGenerate,
  onRun,
}: RoundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[icon] ?? CheckCircle;
  const badge = STATUS_BADGE[status];

  return (
    <Card
      className={
        status === "passed"
          ? "border-emerald-200"
          : status === "failed"
            ? "border-red-200"
            : ""
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              status === "passed"
                ? "bg-emerald-100 text-emerald-600"
                : status === "failed"
                  ? "bg-red-100 text-red-600"
                  : status === "running"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                V{round}: {label}
              </h3>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          {stats.total > 0 && (
            <div className="mr-2">
              <p className="text-lg font-bold">
                {stats.avgScore > 0 ? stats.avgScore : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats.passed}/{stats.total} pass
              </p>
            </div>
          )}
          {cases.length === 0 ? (
            <Button
              size="xs"
              variant="outline"
              onClick={onGenerate}
              disabled={isGenerating || isRunning}
            >
              {isGenerating ? "Đang tạo..." : "Tạo cases"}
            </Button>
          ) : (
            <Button
              size="xs"
              onClick={onRun}
              disabled={isRunning || isGenerating}
            >
              {isRunning ? "Đang chạy..." : "Chạy"}
            </Button>
          )}
        </div>
      </CardHeader>
      {cases.length > 0 && (
        <CardContent className="pt-0">
          <button
            className="flex w-full items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {cases.length} test cases
          </button>
          {expanded && <TestCaseList cases={cases} />}
        </CardContent>
      )}
    </Card>
  );
}
