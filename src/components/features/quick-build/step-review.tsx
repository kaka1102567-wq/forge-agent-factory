"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Rocket,
  ArrowRight,
  CheckCircle,
  XCircle,
  Bot,
  Send,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// === Types ===

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

interface StepReviewProps {
  data: CompleteData;
}

// === Component ===

export function StepReview({ data }: StepReviewProps) {
  const router = useRouter();
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [deployChannel, setDeployChannel] = useState<"TELEGRAM" | "WEB" | null>(null);
  const [botToken, setBotToken] = useState("");
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!deployChannel) return;
    setDeploying(true);
    try {
      const config: Record<string, unknown> = {};
      if (deployChannel === "TELEGRAM" && botToken) {
        config.botToken = botToken;
      }

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: data.agent.id,
          channel: deployChannel,
          config,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Deploy thất bại");
        return;
      }

      toast.success(`Đã deploy ${data.agent.name} lên ${deployChannel}`);
      setDeployDialogOpen(false);
      router.push("/deploy");
    } catch {
      toast.error("Deploy thất bại");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/30">
          <Bot className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">{data.agent.name}</h2>
        <p className="mt-1 text-muted-foreground">
          Agent đã được tạo từ domain &quot;{data.domain.name}&quot;
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tổng kết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border px-3 py-2 text-center">
              <div className="text-2xl font-bold">{data.documentCount}</div>
              <div className="text-xs text-muted-foreground">Tài liệu</div>
            </div>
            <div className="rounded-md border px-3 py-2 text-center">
              <div className="text-2xl font-bold">${data.totalCost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">Chi phí</div>
            </div>
          </div>

          {/* Test results */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Kết quả test</h4>
            {[
              { round: 1, label: "Chức năng", result: data.testResults.round1 },
              { round: 4, label: "An toàn", result: data.testResults.round4 },
            ].map((r) => (
              <div
                key={r.round}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {r.result.passed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    Round {r.round} — {r.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {r.result.score.toFixed(0)} điểm
                  </span>
                  <Badge variant={r.result.passed ? "default" : "destructive"}>
                    {r.result.passed ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        {data.deployReady ? (
          <>
            <Button
              className="flex-1"
              onClick={() => setDeployDialogOpen(true)}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Deploy ngay
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/domains/${data.domain.id}/documents`)}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Cải thiện với Quality Mode
            </Button>
          </>
        ) : (
          <>
            <Button
              className="flex-1"
              onClick={() => router.push(`/domains/${data.domain.id}/documents`)}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Cải thiện với Quality Mode
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/quick")}
            >
              Thử lại
            </Button>
          </>
        )}
      </div>

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy {data.agent.name}</DialogTitle>
            <DialogDescription>
              Chọn kênh triển khai cho agent.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3">
            <Button
              variant={deployChannel === "TELEGRAM" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDeployChannel("TELEGRAM")}
            >
              <Send className="mr-2 h-4 w-4" />
              Telegram
            </Button>
            <Button
              variant={deployChannel === "WEB" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDeployChannel("WEB")}
            >
              <Globe className="mr-2 h-4 w-4" />
              Web
            </Button>
          </div>

          {deployChannel === "TELEGRAM" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Bot Token</label>
              <Input
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lấy token từ @BotFather trên Telegram
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeployDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={
                deploying ||
                !deployChannel ||
                (deployChannel === "TELEGRAM" && !botToken.trim())
              }
            >
              {deploying ? "Đang deploy..." : "Deploy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
