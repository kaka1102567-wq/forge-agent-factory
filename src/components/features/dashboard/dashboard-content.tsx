"use client";

import { useState } from "react";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Star,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// === Types ===

interface Stats {
  totalAgents: number;
  deployedAgents: number;
  avgQualityScore: number;
  monthlyCost: number;
  lastMonthCost: number;
  activeAlerts: number;
}

interface AgentCard {
  id: string;
  name: string;
  archetype: string;
  status: string;
  domainName: string;
  qualityScore: number | null;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  agentName: string | null;
  createdAt: string;
}

interface DashboardContentProps {
  stats: Stats;
  agents: AgentCard[];
  activities: Activity[];
}

// === Helpers ===

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  TESTING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  DEPLOYED: "bg-green-100 text-green-700",
  DISABLED: "bg-red-100 text-red-700",
};

const ACTIVITY_ICONS: Record<string, string> = {
  deploy: "🚀",
  rollback: "↩️",
  test_run: "🧪",
  quality_score: "📊",
  status_change: "🔄",
  agent_create: "🤖",
  health_check: "💓",
};

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

// === Component ===

export function DashboardContent({ stats, agents, activities }: DashboardContentProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated");

  // Tính cost trend
  const costTrend =
    stats.lastMonthCost > 0
      ? ((stats.monthlyCost - stats.lastMonthCost) / stats.lastMonthCost) * 100
      : 0;

  // Filter + sort agents
  const filteredAgents = agents
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "quality") return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* === Stats Cards === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Agents
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalAgents}</p>
            <p className="text-xs text-muted-foreground">
              {stats.deployedAgents} deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chất lượng TB
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getScoreColor(stats.avgQualityScore)}`}>
              {stats.avgQualityScore > 0 ? stats.avgQualityScore : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Điểm trung bình / 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chi phí tháng
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCost(stats.monthlyCost)}</p>
            <div className="flex items-center text-xs">
              {costTrend > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
              ) : costTrend < 0 ? (
                <TrendingDown className="mr-1 h-3 w-3 text-green-500" />
              ) : null}
              <span className={costTrend > 0 ? "text-red-500" : costTrend < 0 ? "text-green-500" : "text-muted-foreground"}>
                {costTrend !== 0 ? `${costTrend > 0 ? "+" : ""}${costTrend.toFixed(1)}%` : "—"} vs tháng trước
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.activeAlerts > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cảnh báo
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.activeAlerts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.activeAlerts > 0 ? "text-red-600" : ""}`}>
              {stats.activeAlerts}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.activeAlerts > 0 ? "Deployment có vấn đề" : "Hệ thống ổn định"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === Agent Cards Grid === */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Agents</h3>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="TESTING">Testing</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DEPLOYED">Deployed</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Mới nhất</SelectItem>
                <SelectItem value="quality">Chất lượng</SelectItem>
                <SelectItem value="name">Tên A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {agents.length === 0 ? "Chưa có agent nào." : "Không có agent phù hợp bộ lọc."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <a key={agent.id} href={`/agents/${agent.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <Badge variant="secondary" className={STATUS_COLORS[agent.status] ?? ""}>
                        {agent.status}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {agent.archetype}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{agent.domainName}</span>
                      <span className={`font-medium ${getScoreColor(agent.qualityScore)}`}>
                        {agent.qualityScore !== null ? `${agent.qualityScore}pts` : "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimeAgo(agent.updatedAt)}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* === Activity Feed === */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Hoạt động gần đây</h3>
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Chưa có hoạt động nào.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 text-base">
                      {ACTIVITY_ICONS[activity.type] ?? "📌"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{activity.description}</p>
                      {activity.agentName && (
                        <p className="text-xs text-muted-foreground">
                          Agent: {activity.agentName}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
