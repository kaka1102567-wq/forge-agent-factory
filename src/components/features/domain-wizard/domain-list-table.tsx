"use client";

import { Badge } from "@/components/ui/badge";
import type { DomainStatus } from "@/generated/prisma/client";

interface Domain {
  id: string;
  name: string;
  industry: string;
  function: string;
  channels: string[];
  status: DomainStatus;
  createdAt: string;
}

interface DomainListTableProps {
  domains: Domain[];
}

const STATUS_VARIANT: Record<
  DomainStatus,
  "default" | "secondary" | "outline"
> = {
  DRAFT: "outline",
  ACTIVE: "default",
  ARCHIVED: "secondary",
};

export function DomainListTable({ domains }: DomainListTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Tên</th>
            <th className="px-4 py-3 text-left font-medium">Ngành</th>
            <th className="px-4 py-3 text-left font-medium">Chức năng</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              Kênh
            </th>
            <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              Ngày tạo
            </th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr
              key={domain.id}
              className="border-b transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-medium">{domain.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {domain.industry.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {domain.function}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  {domain.channels.slice(0, 3).map((ch) => (
                    <Badge key={ch} variant="secondary" className="text-xs">
                      {ch}
                    </Badge>
                  ))}
                  {domain.channels.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{domain.channels.length - 3}
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[domain.status]}>
                  {domain.status}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {new Date(domain.createdAt).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
