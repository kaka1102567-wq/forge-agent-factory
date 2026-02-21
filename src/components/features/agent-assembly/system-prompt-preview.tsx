"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Save, ArrowLeft } from "lucide-react";

interface SystemPromptPreviewProps {
  systemPrompt: string;
  capabilities: string[];
  limitations: string[];
  meta?: { cost: number; latencyMs: number; modelUsed: string };
  onTestPreview: () => void;
  onSaveAgent: () => void;
  onBack: () => void;
  saving?: boolean;
}

// Parse system prompt thành sections theo ## headers
function parseSections(prompt: string): { title: string; content: string }[] {
  const lines = prompt.split("\n");
  const sections: { title: string; content: string }[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join("\n").trim(),
        });
      }
      currentTitle = line.replace("## ", "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push last section
  if (currentTitle || currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
  }

  return sections;
}

export function SystemPromptPreview({
  systemPrompt,
  capabilities,
  limitations,
  meta,
  onTestPreview,
  onSaveAgent,
  onBack,
  saving = false,
}: SystemPromptPreviewProps) {
  const sections = parseSections(systemPrompt);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">System Prompt</CardTitle>
          {meta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{meta.modelUsed}</span>
              <span>{(meta.latencyMs / 1000).toFixed(1)}s</span>
              <span>${meta.cost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 pt-0">
        {/* Collapsible sections */}
        <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-md border p-3">
          {sections.map((section, i) => (
            <details key={i} open={i === 0}>
              <summary className="cursor-pointer text-sm font-semibold hover:text-primary">
                {section.title || "Tong quan"}
              </summary>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {section.content}
              </pre>
            </details>
          ))}
        </div>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium">Kha nang</p>
            <div className="flex flex-wrap gap-1">
              {capabilities.map((cap, i) => (
                <Badge key={i} variant="default" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Limitations */}
        {limitations.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium">Gioi han</p>
            <div className="flex flex-wrap gap-1">
              {limitations.map((lim, i) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {lim}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-3 w-3" />
            Quay lai
          </Button>
          <Button variant="outline" size="sm" onClick={onTestPreview}>
            <MessageSquare className="mr-1 h-3 w-3" />
            Thu nghiem
          </Button>
          <Button size="sm" onClick={onSaveAgent} disabled={saving}>
            <Save className="mr-1 h-3 w-3" />
            {saving ? "Dang luu..." : "Luu Agent"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
