"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/generated/prisma/client";

interface AgentItem {
  id: string;
  name: string;
  archetype: string;
  status: AgentStatus;
  createdAt: string;
  domain: { id: string; name: string };
}

interface AgentListTableProps {
  agents: AgentItem[];
}

const STATUS_VARIANT: Record<AgentStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  TESTING: "secondary",
  ACTIVE: "default",
  DEPLOYED: "default",
  DISABLED: "secondary",
};

export function AgentListTable({ agents }: AgentListTableProps) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Chưa có agent nào.</p>
        <p className="text-sm text-muted-foreground">
          Chọn domain và lắp ráp agent đầu tiên.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Tên</th>
            <th className="px-4 py-3 text-left font-medium">Archetype</th>
            <th className="px-4 py-3 text-left font-medium">Domain</th>
            <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              Ngày tạo
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.id}
              className="border-b transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/agents/${agent.id}`}
                  className="hover:underline"
                >
                  {agent.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="text-xs">
                  {agent.archetype}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {agent.domain.name}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[agent.status]}>
                  {agent.status}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {new Date(agent.createdAt).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
