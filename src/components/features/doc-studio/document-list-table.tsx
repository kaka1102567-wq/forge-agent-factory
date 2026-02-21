"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/generated/prisma/client";

interface DocumentItem {
  id: string;
  title: string;
  status: DocumentStatus;
  qualityScore: number | null;
  version: number;
  updatedAt: string;
  domain?: { id: string; name: string };
  template: { id: string; name: string; category: string } | null;
}

interface DocumentListTableProps {
  documents: DocumentItem[];
  showDomain?: boolean;
}

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  REVIEW: "secondary",
  APPROVED: "default",
  PUBLISHED: "default",
};

function getScoreBadge(score: number | null) {
  if (score === null) return <span className="text-muted-foreground">--</span>;
  const variant = score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive";
  return <Badge variant={variant}>{Math.round(score)}</Badge>;
}

export function DocumentListTable({ documents, showDomain = false }: DocumentListTableProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Chua co document nao.</p>
        <p className="text-sm text-muted-foreground">
          Tao document moi tu template de bat dau.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Ten</th>
            {showDomain && (
              <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
                Domain
              </th>
            )}
            <th className="px-4 py-3 text-left font-medium">Template</th>
            <th className="px-4 py-3 text-left font-medium">Diem</th>
            <th className="px-4 py-3 text-left font-medium">Trang thai</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              Cap nhat
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="border-b transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/documents/${doc.id}`}
                  className="hover:underline"
                >
                  {doc.title}
                </Link>
              </td>
              {showDomain && doc.domain && (
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {doc.domain.name}
                </td>
              )}
              <td className="px-4 py-3 text-muted-foreground">
                {doc.template?.name ?? "--"}
              </td>
              <td className="px-4 py-3">{getScoreBadge(doc.qualityScore)}</td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[doc.status]}>
                  {doc.status}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {new Date(doc.updatedAt).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
