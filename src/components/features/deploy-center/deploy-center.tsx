"use client";

import { useState, useCallback } from "react";
import {
  Rocket,
  Send,
  Globe,
  RotateCcw,
  Heart,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { AgentStatus } from "@/generated/prisma/client";

// === Types ===

interface TestResult {
  round: number;
  passed: boolean;
  score: number;
}

interface DeploymentInfo {
  id: string;
  channel: "TELEGRAM" | "WEB";
  status: "ACTIVE" | "ROLLED_BACK" | "STOPPED";
  healthStatus: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
  lastHealthCheck: string | null;
  createdAt: string;
}

interface AgentForDeploy {
  id: string;
  name: string;
  archetype: string;
  status: AgentStatus;
  quickMode: boolean;
  domain: { name: string };
  testResults: TestResult[];
  deployments: DeploymentInfo[];
}

interface DeployCenterProps {
  agents: AgentForDeploy[];
}

// === Health indicator ===

const HEALTH_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  HEALTHY: { color: "text-emerald-600", bg: "bg-emerald-500", label: "Healthy" },
  DEGRADED: { color: "text-amber-600", bg: "bg-amber-500", label: "Degraded" },
  DOWN: { color: "text-red-600", bg: "bg-red-500", label: "Down" },
  UNKNOWN: { color: "text-muted-foreground", bg: "bg-muted-foreground/50", label: "Unknown" },
};

function HealthDot({ status }: { status: string }) {
  const config = HEALTH_CONFIG[status] ?? HEALTH_CONFIG.UNKNOWN;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.bg}`}
        title={config.label}
      />
      <span className={`text-xs ${config.color}`}>{config.label}</span>
    </span>
  );
}

// === Main Component ===

export function DeployCenter({ agents }: DeployCenterProps) {
  const [agentList, setAgentList] = useState(agents);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentForDeploy | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<"TELEGRAM" | "WEB" | null>(null);
  const [botToken, setBotToken] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);

  // Kiểm tra agent đã pass đủ test — Quick Mode chỉ cần R1 + R4
  const isDeployable = useCallback((agent: AgentForDeploy) => {
    const passedRounds = agent.testResults.filter((r) => r.passed);
    if (agent.quickMode) {
      return passedRounds.some((r) => r.round === 1) && passedRounds.some((r) => r.round === 4);
    }
    return passedRounds.length >= 6;
  }, []);

  // Refresh data
  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const allAgents = await res.json();

      // Fetch deployments cho mỗi agent
      const enriched: AgentForDeploy[] = await Promise.all(
        allAgents.map(async (agent: AgentForDeploy) => {
          try {
            const statusRes = await fetch(`/api/deploy/status/${agent.id}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              return { ...agent, deployments: statusData.deployments ?? [] };
            }
          } catch { /* ignore */ }
          return { ...agent, deployments: [] };
        })
      );
      setAgentList(enriched);
    } catch { /* ignore */ }
  }, []);

  // Deploy
  const handleDeploy = useCallback(async () => {
    if (!selectedAgent || !selectedChannel) return;

    setDeploying(true);
    try {
      const config: Record<string, unknown> = {};
      if (selectedChannel === "TELEGRAM" && botToken) {
        config.botToken = botToken;
      }

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          channel: selectedChannel,
          config,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Deploy thất bại");
        return;
      }

      toast.success(
        `Đã deploy ${selectedAgent.name} lên ${selectedChannel}`
      );
      setDeployDialogOpen(false);
      setBotToken("");

      // Nếu Web → hiện embed code
      if (selectedChannel === "WEB") {
        const embedRes = await fetch(
          `/api/channels/web/${selectedAgent.id}`
        );
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          setEmbedCode(embedData.embedCode);
          setEmbedDialogOpen(true);
        }
      }

      await refreshAgents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Deploy thất bại"
      );
    } finally {
      setDeploying(false);
    }
  }, [selectedAgent, selectedChannel, botToken, refreshAgents]);

  // Rollback
  const handleRollback = useCallback(
    async (agentId: string, channel: "TELEGRAM" | "WEB") => {
      try {
        const res = await fetch("/api/deploy/rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, channel }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error ?? "Rollback thất bại");
          return;
        }

        toast.success(`Đã rollback ${channel}`);
        await refreshAgents();
      } catch {
        toast.error("Rollback thất bại");
      }
    },
    [refreshAgents]
  );

  // Health check
  const runHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    try {
      const res = await fetch("/api/deploy/health");
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Health check: ${data.healthy} healthy, ${data.degraded} degraded, ${data.down} down`
        );
        await refreshAgents();
      }
    } catch {
      toast.error("Health check thất bại");
    } finally {
      setHealthChecking(false);
    }
  }, [refreshAgents]);

  // Copy embed code
  const copyEmbedCode = useCallback(() => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [embedCode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deploy</h2>
          <p className="text-sm text-muted-foreground">
            Triển khai agent lên Telegram và Web.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={healthChecking}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${healthChecking ? "animate-spin" : ""}`}
          />
          Health Check
        </Button>
      </div>

      {/* Agent cards */}
      {agentList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {agentList.map((agent) => {
            const deployable = isDeployable(agent);
            const passedRounds = agent.testResults.filter((r) => r.passed).length;
            const activeDeployments = agent.deployments.filter(
              (d) => d.status === "ACTIVE"
            );

            return (
              <Card key={agent.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {agent.domain.name} &middot; {agent.archetype}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {agent.quickMode && (
                        <Badge variant="outline">Quick</Badge>
                      )}
                      <Badge
                        variant={
                          agent.status === "DEPLOYED"
                            ? "default"
                            : agent.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Test progress dots */}
                  <div className="flex items-center gap-1">
                    {(agent.quickMode ? [1, 4] : [1, 2, 3, 4, 5, 6]).map((round) => {
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
                          title={`V${round}: ${result?.passed ? "Pass" : result ? "Fail" : "Chưa test"}`}
                        />
                      );
                    })}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {passedRounds}/{agent.quickMode ? 2 : 6} vòng
                    </span>
                  </div>

                  {/* Active deployments */}
                  {activeDeployments.length > 0 && (
                    <div className="space-y-2">
                      {activeDeployments.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {dep.channel === "TELEGRAM" ? (
                              <Send className="h-3.5 w-3.5" />
                            ) : (
                              <Globe className="h-3.5 w-3.5" />
                            )}
                            <span className="text-sm font-medium">
                              {dep.channel}
                            </span>
                            <HealthDot status={dep.healthStatus} />
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              handleRollback(agent.id, dep.channel)
                            }
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Rollback
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deploy buttons */}
                  {deployable ? (
                    <div className="flex gap-2">
                      {!activeDeployments.some(
                        (d) => d.channel === "TELEGRAM"
                      ) && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setSelectedChannel("TELEGRAM");
                            setDeployDialogOpen(true);
                          }}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Telegram
                        </Button>
                      )}
                      {!activeDeployments.some(
                        (d) => d.channel === "WEB"
                      ) && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setSelectedChannel("WEB");
                            setDeployDialogOpen(true);
                          }}
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          Web
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      {agent.quickMode
                        ? "Cần pass round 1 (Chức năng) + round 4 (An toàn)"
                        : "Cần hoàn thành 6/6 vòng test để deploy"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Rocket className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Chưa có agent nào</h3>
          <p className="text-sm text-muted-foreground">
            Tạo và test agent trước để bắt đầu deploy.
          </p>
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Deploy {selectedAgent?.name} lên {selectedChannel}
            </DialogTitle>
            <DialogDescription>
              {selectedChannel === "TELEGRAM"
                ? "Nhập Bot Token từ @BotFather để kết nối Telegram."
                : "Agent sẽ được triển khai với widget nhúng web."}
            </DialogDescription>
          </DialogHeader>

          {selectedChannel === "TELEGRAM" && (
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
                (selectedChannel === "TELEGRAM" && !botToken.trim())
              }
            >
              {deploying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang deploy...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mã nhúng Web Widget</DialogTitle>
            <DialogDescription>
              Dán đoạn code này vào trang web để hiển thị chat widget.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
              {embedCode}
            </pre>
            <Button
              size="xs"
              variant="outline"
              className="absolute right-2 top-2"
              onClick={copyEmbedCode}
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
