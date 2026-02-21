"use client";

import { Check, Loader2, Circle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// === Types ===

export interface PipelineStep {
  id: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
}

export interface TestCaseEvent {
  round: number;
  caseIndex: number;
  total: number;
  passed: boolean;
  score: number;
}

export interface TestRoundEvent {
  round: number;
  passed: boolean;
  score: number;
  passRate: number;
}

interface StepBuildingProps {
  steps: PipelineStep[];
  percent: number;
  message: string;
  testEvents: TestCaseEvent[];
  roundResults: TestRoundEvent[];
  safetyBlocked: boolean;
}

// === Helpers ===

const STEP_LABELS: Record<number, string> = {
  1: "Phân loại lĩnh vực",
  2: "Tạo domain",
  3: "Sinh tài liệu",
  4: "Lắp ráp agent",
  5: "Sinh test cases",
  6: "Chạy test",
  7: "Hoàn tất",
};

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  switch (status) {
    case "done":
      return <Check className="h-4 w-4 text-emerald-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "error":
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40" />;
  }
}

// === Component ===

export function StepBuilding({
  steps,
  percent,
  message,
  testEvents,
  roundResults,
  safetyBlocked,
}: StepBuildingProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Đang build agent...</span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>

      {/* Pipeline steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                  step.status === "running"
                    ? "bg-primary/5"
                    : step.status === "done"
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : ""
                }`}
              >
                <StepIcon status={step.status} />
                <span
                  className={`text-sm ${
                    step.status === "pending"
                      ? "text-muted-foreground"
                      : "font-medium"
                  }`}
                >
                  {STEP_LABELS[step.id] ?? step.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test results (hiện khi đang/sau chạy test) */}
      {(testEvents.length > 0 || roundResults.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="mb-3 text-sm font-medium">Kết quả test</h4>

            {/* Round results */}
            {roundResults.map((rr) => (
              <div
                key={rr.round}
                className="mb-2 flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">
                  Round {rr.round} — {rr.round === 1 ? "Chức năng" : "An toàn"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {rr.score.toFixed(0)} điểm
                  </span>
                  <Badge variant={rr.passed ? "default" : "destructive"}>
                    {rr.passed ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </div>
            ))}

            {/* Live test dots */}
            {testEvents.length > 0 && roundResults.length < 2 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {testEvents.map((ev, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full ${
                      ev.passed ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    title={`R${ev.round} #${ev.caseIndex}: ${ev.score} điểm`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Safety blocked warning */}
      {safetyBlocked && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Agent không vượt qua kiểm tra an toàn
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Agent đã bị chặn vì vi phạm chính sách an toàn. Hãy cải thiện
                với Quality Mode để kiểm soát chi tiết hơn.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
