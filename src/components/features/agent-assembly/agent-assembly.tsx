"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AGENT_ARCHETYPES } from "@/lib/constants";
import type { AgentConfig } from "@/lib/schemas/agent-config";
import {
  DocumentChecklist,
  type ChecklistDocument,
} from "./document-checklist";
import { SystemPromptPreview } from "./system-prompt-preview";
import { AgentConfigPanel } from "./agent-config-panel";
import { PreviewChat } from "./preview-chat";

type Phase = "select" | "compiling" | "preview" | "testing" | "saving";

interface AssembleResult {
  systemPrompt: string;
  config: { temperature: number; maxTokens: number };
  capabilities: string[];
  limitations: string[];
}

interface AgentAssemblyProps {
  domainId: string;
  domainName: string;
  domainFunction: string;
  domainChannels: string[];
  documents: ChecklistDocument[];
}

const DEFAULT_CONFIG: AgentConfig = {
  model: "sonnet",
  temperature: 0.7,
  maxTokens: 4096,
  channels: [],
  tools: [],
  knowledgeBase: [],
  guardrails: {
    blockedTopics: [],
    escalationTriggers: [],
  },
};

export function AgentAssembly({
  domainId,
  domainName,
  domainFunction,
  domainChannels,
  documents,
}: AgentAssemblyProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<string[]>([]);
  const [archetype, setArchetype] = useState(domainFunction);
  const [config, setConfig] = useState<AgentConfig>({
    ...DEFAULT_CONFIG,
    channels: domainChannels,
  });
  const [assembleResult, setAssembleResult] = useState<AssembleResult | null>(null);
  const [meta, setMeta] = useState<{
    cost: number;
    latencyMs: number;
    modelUsed: string;
  } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const toggleDoc = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.length === documents.length ? [] : documents.map((d) => d.id)
    );
  }, [documents]);

  // Compile: gọi /api/agents/assemble
  const handleCompile = async () => {
    if (selected.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 tài liệu");
      return;
    }

    setPhase("compiling");
    try {
      const res = await fetch("/api/agents/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId,
          documentIds: selected,
          archetype,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Assembly failed");
      }

      const data = await res.json();
      setAssembleResult(data.agent);
      setMeta(data.meta);

      // Apply config từ AI nếu có
      if (data.agent.config) {
        setConfig((prev) => ({
          ...prev,
          temperature: data.agent.config.temperature ?? prev.temperature,
          maxTokens: data.agent.config.maxTokens ?? prev.maxTokens,
        }));
      }

      setPhase("preview");
      toast.success("Đã lắp ráp xong system prompt!");
    } catch (error) {
      setPhase("select");
      toast.error(error instanceof Error ? error.message : "Lỗi lắp ráp");
    }
  };

  // Save agent: gọi POST /api/agents
  const handleSave = async () => {
    if (!assembleResult) return;

    setPhase("saving");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${domainName} - ${archetype} Agent`,
          domainId,
          archetype,
          systemPrompt: assembleResult.systemPrompt,
          config,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.success("Đã lưu agent thành công!");
      router.push("/agents");
    } catch (error) {
      setPhase("preview");
      toast.error(error instanceof Error ? error.message : "Lỗi lưu agent");
    }
  };

  const isCompiling = phase === "compiling";
  const isSaving = phase === "saving";
  const showPreview = phase === "preview" || phase === "testing" || phase === "saving";

  return (
    <div className="space-y-6">
      {/* Archetype selector + Compile button */}
      <div className="flex items-end gap-4">
        <div className="w-48 space-y-1">
          <Label className="text-xs">Archetype</Label>
          <Select value={archetype} onValueChange={setArchetype} disabled={showPreview}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENT_ARCHETYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!showPreview && (
          <Button onClick={handleCompile} disabled={isCompiling || selected.length === 0}>
            {isCompiling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lắp ráp...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Lắp ráp Agent ({selected.length} tài liệu)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Main grid */}
      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Left: Document Checklist */}
        <DocumentChecklist
          documents={documents}
          selected={selected}
          onToggle={toggleDoc}
          onToggleAll={toggleAll}
          disabled={showPreview}
        />

        {/* Center: System Prompt Preview (only after compile) */}
        {showPreview && assembleResult && (
          <SystemPromptPreview
            systemPrompt={assembleResult.systemPrompt}
            capabilities={assembleResult.capabilities}
            limitations={assembleResult.limitations}
            meta={meta ?? undefined}
            onTestPreview={() => setChatOpen(true)}
            onSaveAgent={handleSave}
            onBack={() => setPhase("select")}
            saving={isSaving}
          />
        )}

        {/* Right: Config Panel */}
        <AgentConfigPanel
          config={config}
          domainChannels={domainChannels}
          onChange={setConfig}
          disabled={isCompiling || isSaving}
        />
      </div>

      {/* Chat Preview Dialog */}
      {assembleResult && (
        <PreviewChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          systemPrompt={assembleResult.systemPrompt}
          config={config}
          onAccept={() => {
            setChatOpen(false);
            handleSave();
          }}
          onReject={() => {
            setChatOpen(false);
            setPhase("select");
          }}
        />
      )}
    </div>
  );
}
