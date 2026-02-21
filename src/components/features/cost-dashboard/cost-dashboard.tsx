"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, Zap, Hash, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// === Types ===

interface DailyData {
  date: string;
  haiku: number;
  sonnet: number;
  opus: number;
  total: number;
}

interface PerAgentData {
  agentId: string;
  name: string;
  cost: number;
  requests: number;
  tokens: number;
}

interface CostDashboardProps {
  daily: DailyData[];
  perAgent: PerAgentData[];
  modelTotals: { haiku: number; sonnet: number; opus: number };
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
}

// === Constants ===

const MODEL_COLORS = {
  haiku: "#22c55e",   // green
  sonnet: "#3b82f6",  // blue
  opus: "#a855f7",    // purple
};

const BUDGET_THRESHOLD = 50; // $50/tháng

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

// === Component ===

export function CostDashboard({
  daily,
  perAgent,
  modelTotals,
  totalCost,
  totalRequests,
  totalTokens,
}: CostDashboardProps) {
  const budgetUsed = (totalCost / BUDGET_THRESHOLD) * 100;
  const overBudget = totalCost > BUDGET_THRESHOLD;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Chi phí AI</h2>

      {/* === Summary Cards === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng chi phí (30 ngày)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCost(totalCost)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng requests
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng tokens
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatTokens(totalTokens)}</p>
          </CardContent>
        </Card>

        <Card className={overBudget ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ngân sách
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overBudget ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overBudget ? "text-red-600" : ""}`}>
              {budgetUsed.toFixed(1)}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : budgetUsed > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCost(totalCost)} / {formatCost(BUDGET_THRESHOLD)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === Daily Cost Chart === */}
      <Card>
        <CardHeader>
          <CardTitle>Chi phí theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có dữ liệu chi phí.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v: number) => `$${v.toFixed(4)}`} className="text-xs" />
                <Tooltip
                  formatter={(value) => formatCost(Number(value ?? 0))}
                  labelFormatter={(label) => `Ngày: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Tổng"
                  stroke="#6b7280"
                  strokeWidth={2}
                  dot={false}
                />
                <Line type="monotone" dataKey="haiku" name="Haiku" stroke={MODEL_COLORS.haiku} dot={false} />
                <Line type="monotone" dataKey="sonnet" name="Sonnet" stroke={MODEL_COLORS.sonnet} dot={false} />
                <Line type="monotone" dataKey="opus" name="Opus" stroke={MODEL_COLORS.opus} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* === Model Breakdown === */}
      <Card>
        <CardHeader>
          <CardTitle>Phân bổ theo model</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v: number) => `$${v.toFixed(4)}`} className="text-xs" />
                <Tooltip formatter={(value) => formatCost(Number(value ?? 0))} />
                <Legend />
                <Bar dataKey="haiku" name="Haiku" fill={MODEL_COLORS.haiku} stackId="a" />
                <Bar dataKey="sonnet" name="Sonnet" fill={MODEL_COLORS.sonnet} stackId="a" />
                <Bar dataKey="opus" name="Opus" fill={MODEL_COLORS.opus} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Model totals summary */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {(["haiku", "sonnet", "opus"] as const).map((model) => (
              <div key={model} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: MODEL_COLORS[model] }}
                  />
                  <span className="text-sm font-medium capitalize">{model}</span>
                </div>
                <p className="mt-1 text-lg font-bold">{formatCost(modelTotals[model])}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === Per-Agent Cost Table === */}
      <Card>
        <CardHeader>
          <CardTitle>Chi phí theo agent</CardTitle>
        </CardHeader>
        <CardContent>
          {perAgent.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có dữ liệu chi phí agent.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Agent</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Chi phí</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Requests</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tokens</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tỉ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {perAgent.map((agent) => (
                    <tr key={agent.agentId} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{agent.name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCost(agent.cost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {agent.requests}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {formatTokens(agent.tokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {totalCost > 0 ? `${((agent.cost / totalCost) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
