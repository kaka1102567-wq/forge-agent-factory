"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentStatus } from "@/generated/prisma/client";

interface AgentSummaryCardProps {
  agent: {
    name: string;
    archetype: string;
    status: AgentStatus;
    domain: { name: string };
  };
  overallScore: number;
  totalCost: number;
}

const STATUS_VARIANT: Record<AgentStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  TESTING: "secondary",
  ACTIVE: "default",
  DISABLED: "secondary",
};

export function AgentSummaryCard({
  agent,
  overallScore,
  totalCost,
}: AgentSummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <Badge variant={STATUS_VARIANT[agent.status]}>
                {agent.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.domain.name} &middot;{" "}
              <Badge variant="secondary" className="text-xs">
                {agent.archetype}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-2xl font-bold">
              {overallScore > 0 ? `${overallScore}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Diem tong</p>
          </div>
          <div>
            <p className="text-sm font-medium">
              ${totalCost.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground">Chi phi</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
