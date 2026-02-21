"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "./tiptap-editor";
import { QualityGauge } from "./quality-gauge";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  Save,
  Sparkles,
  RefreshCw,
  Lightbulb,
  History,
  RotateCcw,
} from "lucide-react";

interface QualityDetail {
  score: number;
  breakdown: {
    relevance: number;
    completeness: number;
    clarity: number;
    tone: number;
  };
  issues: string[];
  suggestions: string[];
}

interface VersionEntry {
  version: number;
  content: string;
  savedAt: string;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  status: string;
  version: number;
  qualityScore: number | null;
  qualityDetail: QualityDetail | null;
  versionHistory: VersionEntry[];
  domain: { id: string; name: string };
  template: { id: string; name: string; category: string } | null;
}

interface DocStudioEditorProps {
  document: DocumentData;
}

const STATUS_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  DRAFT: "outline",
  REVIEW: "secondary",
  APPROVED: "default",
  PUBLISHED: "default",
};

export function DocStudioEditor({ document: doc }: DocStudioEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [status, setStatus] = useState(doc.status);
  const [qualityScore, setQualityScore] = useState(doc.qualityScore);
  const [qualityDetail, setQualityDetail] = useState<QualityDetail | null>(
    doc.qualityDetail
  );
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>(
    doc.versionHistory ?? []
  );
  const [version, setVersion] = useState(doc.version);
  const [isScoring, setIsScoring] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { isSaving: isAutoSaving, isDirty, lastSavedAt, errorCount: autoSaveErrors } = useAutoSave({
    documentId: doc.id,
    content,
  });

  // Lưu thủ công
  const handleSave = useCallback(async () => {
    setIsSavingManual(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, status }),
      });

      if (!res.ok) throw new Error("Save failed");

      const updated = await res.json();
      setVersion(updated.version);
      setVersionHistory(updated.versionHistory ?? []);
      toast.success("Da luu thanh cong");
    } catch {
      toast.error("Loi khi luu document");
    } finally {
      setIsSavingManual(false);
    }
  }, [doc.id, title, content, status]);

  // Chấm điểm chất lượng
  const handleScore = useCallback(async () => {
    setIsScoring(true);
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });

      if (!res.ok) throw new Error("Score failed");

      const data = await res.json();
      setQualityScore(data.score);
      setQualityDetail(data);
      toast.success(`Diem chat luong: ${Math.round(data.score)}/100`);
    } catch {
      toast.error("Loi khi cham diem");
    } finally {
      setIsScoring(false);
    }
  }, [doc.id]);

  // Khôi phục version cũ + persist về DB
  const handleRestore = useCallback(
    async (entry: VersionEntry) => {
      setContent(entry.content);
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: entry.content }),
        });
        if (!res.ok) throw new Error("Restore save failed");
        const updated = await res.json();
        setVersion(updated.version);
        setVersionHistory(updated.versionHistory ?? []);
        toast.success(`Da khoi phuc version ${entry.version}`);
      } catch {
        toast.error("Khoi phuc thanh cong nhung luu that bai");
      }
    },
    [doc.id]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md text-lg font-semibold"
        />
        {doc.template && (
          <Badge variant="secondary">{doc.template.name}</Badge>
        )}
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>
        <span className="text-xs text-muted-foreground">v{version}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <span className={`text-xs ${autoSaveErrors > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {autoSaveErrors > 0
              ? `Loi luu tu dong (${autoSaveErrors}x)`
              : isAutoSaving
                ? "Dang luu..."
                : isDirty
                  ? "Chua luu"
                  : lastSavedAt
                    ? `Luu luc ${lastSavedAt.toLocaleTimeString("vi-VN")}`
                    : ""}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleScore}
            disabled={isScoring}
          >
            {isScoring ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Cham diem
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSavingManual}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Luu
          </Button>
        </div>
      </div>

      {/* Main content: editor + quality panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Editor (60%) */}
        <div className="lg:col-span-3">
          <TiptapEditor content={content} onChange={setContent} />
        </div>

        {/* Quality panel (40%) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Overall score */}
          {qualityScore !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Diem chat luong</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <QualityGauge
                    label="Tong diem"
                    score={qualityScore}
                    size={100}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown */}
          {qualityDetail && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chi tiet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <QualityGauge
                    label="Phu hop"
                    score={qualityDetail.breakdown.relevance}
                  />
                  <QualityGauge
                    label="Day du"
                    score={qualityDetail.breakdown.completeness}
                  />
                  <QualityGauge
                    label="Ro rang"
                    score={qualityDetail.breakdown.clarity}
                  />
                  <QualityGauge
                    label="Giong dieu"
                    score={qualityDetail.breakdown.tone}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {qualityDetail && qualityDetail.suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Goi y cai thien</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {qualityDetail.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Issues */}
          {qualityDetail && qualityDetail.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Van de can sua</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {qualityDetail.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      &bull; {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Version history */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Lich su phien ban</CardTitle>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {versionHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chua co lich su
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {[...versionHistory].reverse().map((entry, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span>
                          v{entry.version} &mdash;{" "}
                          {new Date(entry.savedAt).toLocaleString("vi-VN")}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRestore(entry)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
