"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, FileText } from "lucide-react";

export interface ChecklistDocument {
  id: string;
  title: string;
  status: string;
  qualityScore: number | null;
  category: string;
}

interface DocumentChecklistProps {
  documents: ChecklistDocument[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  disabled?: boolean;
}

export function DocumentChecklist({
  documents,
  selected,
  onToggle,
  onToggleAll,
  disabled = false,
}: DocumentChecklistProps) {
  const allSelected = documents.length > 0 && selected.length === documents.length;
  const approvedDocs = documents.filter((d) => d.status === "APPROVED" || d.status === "PUBLISHED");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tài liệu nguồn</CardTitle>
          <Button
            variant="ghost"
            size="xs"
            onClick={onToggleAll}
            disabled={disabled}
          >
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {selected.length}/{documents.length} tài liệu đã chọn
          {approvedDocs.length < documents.length && (
            <span className="ml-1">
              ({approvedDocs.length} đã duyệt)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Chưa có tài liệu nào.
          </p>
        ) : (
          documents.map((doc) => {
            const isSelected = selected.includes(doc.id);
            const isApproved = doc.status === "APPROVED" || doc.status === "PUBLISHED";

            return (
              <button
                key={doc.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(doc.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "hover:bg-muted/50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.category}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isApproved ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                  {doc.qualityScore !== null && (
                    <Badge
                      variant={doc.qualityScore >= 80 ? "default" : doc.qualityScore >= 60 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {Math.round(doc.qualityScore)}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
