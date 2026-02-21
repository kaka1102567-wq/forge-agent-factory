"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { StepDescribe } from "./step-describe";
import {
  StepBuilding,
  type PipelineStep,
  type TestCaseEvent,
  type TestRoundEvent,
} from "./step-building";
import { StepReview } from "./step-review";

// === Types ===

type Phase = "describe" | "building" | "review" | "blocked";

interface CompleteData {
  agent: { id: string; name: string };
  domain: { id: string; name: string };
  documentCount: number;
  testResults: {
    round1: { passed: boolean; score: number };
    round4: { passed: boolean; score: number };
  };
  deployReady: boolean;
  totalCost: number;
}

// === Initial pipeline steps ===

function initialSteps(): PipelineStep[] {
  return [
    { id: 1, name: "Phân loại lĩnh vực", status: "pending" },
    { id: 2, name: "Tạo domain", status: "pending" },
    { id: 3, name: "Sinh tài liệu", status: "pending" },
    { id: 4, name: "Lắp ráp agent", status: "pending" },
    { id: 5, name: "Sinh test cases", status: "pending" },
    { id: 6, name: "Chạy test", status: "pending" },
    { id: 7, name: "Hoàn tất", status: "pending" },
  ];
}

// === SSE Parser ===

function parseSSEChunk(chunk: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = chunk.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        data = line.slice(6);
      }
    }

    if (event && data) {
      events.push({ event, data });
    }
  }

  return events;
}

// === Component ===

export function QuickBuild() {
  const [phase, setPhase] = useState<Phase>("describe");
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps());
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");
  const [testEvents, setTestEvents] = useState<TestCaseEvent[]>([]);
  const [roundResults, setRoundResults] = useState<TestRoundEvent[]>([]);
  const [safetyBlocked, setSafetyBlocked] = useState(false);
  const [completeData, setCompleteData] = useState<CompleteData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (data: { businessDescription: string; channels: string[] }) => {
      // Reset state
      setPhase("building");
      setSteps(initialSteps());
      setPercent(0);
      setMessage("Bắt đầu pipeline...");
      setTestEvents([]);
      setRoundResults([]);
      setSafetyBlocked(false);
      setCompleteData(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/quick-build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Không thể bắt đầu pipeline");
          setPhase("describe");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          toast.error("Không thể kết nối SSE stream");
          setPhase("describe");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events từ buffer
          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const complete = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEChunk(complete);

          for (const { event, data: raw } of events) {
            try {
              const payload = JSON.parse(raw);

              switch (event) {
                case "step_start":
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === payload.step ? { ...s, status: "running" } : s
                    )
                  );
                  break;

                case "step_complete":
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === payload.step ? { ...s, status: "done" } : s
                    )
                  );
                  break;

                case "progress":
                  setPercent(payload.percent);
                  setMessage(payload.message);
                  break;

                case "test_case_complete":
                  setTestEvents((prev) => [...prev, payload]);
                  break;

                case "test_round_complete":
                  setRoundResults((prev) => [...prev, payload]);
                  break;

                case "safety_blocked":
                  setSafetyBlocked(true);
                  break;

                case "complete":
                  setCompleteData(payload);
                  if (payload.deployReady) {
                    setPhase("review");
                    toast.success("Agent đã sẵn sàng deploy!");
                  } else {
                    setPhase("blocked");
                    toast.error("Agent cần cải thiện thêm");
                  }
                  break;

                case "error":
                  // Đánh dấu step đang running → error
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.status === "running" ? { ...s, status: "error" } : s
                    )
                  );
                  toast.error(payload.message ?? "Pipeline error");
                  setPhase("describe");
                  break;
              }
            } catch {
              // Skip unparseable events
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("Lỗi kết nối");
        setPhase("describe");
      }
    },
    []
  );

  switch (phase) {
    case "describe":
      return <StepDescribe onSubmit={handleSubmit} />;

    case "building":
      return (
        <StepBuilding
          steps={steps}
          percent={percent}
          message={message}
          testEvents={testEvents}
          roundResults={roundResults}
          safetyBlocked={safetyBlocked}
        />
      );

    case "review":
      return completeData ? <StepReview data={completeData} /> : null;

    case "blocked":
      return completeData ? <StepReview data={completeData} /> : null;
  }
}
