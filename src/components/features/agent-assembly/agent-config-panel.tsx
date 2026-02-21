"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AgentConfig } from "@/lib/schemas/agent-config";

interface AgentConfigPanelProps {
  config: AgentConfig;
  domainChannels: string[];
  onChange: (config: AgentConfig) => void;
  disabled?: boolean;
}

export function AgentConfigPanel({
  config,
  domainChannels,
  onChange,
  disabled = false,
}: AgentConfigPanelProps) {
  const update = (partial: Partial<AgentConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cấu hình</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Model */}
        <div className="space-y-1">
          <Label className="text-xs">Model</Label>
          <Select
            value={config.model}
            onValueChange={(v) => update({ model: v as AgentConfig["model"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="haiku">Haiku (nhanh, rẻ)</SelectItem>
              <SelectItem value="sonnet">Sonnet (cân bằng)</SelectItem>
              <SelectItem value="opus">Opus (mạnh nhất)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <Label className="text-xs">Temperature ({config.temperature})</Label>
          <Input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={config.temperature}
            onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
            disabled={disabled}
            className="h-8"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-1">
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            min={256}
            max={8192}
            step={256}
            value={config.maxTokens}
            onChange={(e) => update({ maxTokens: parseInt(e.target.value) || 4096 })}
            disabled={disabled}
            className="h-8 text-xs"
          />
        </div>

        {/* Channels */}
        <div className="space-y-1">
          <Label className="text-xs">Kênh triển khai</Label>
          <div className="flex flex-wrap gap-2">
            {domainChannels.map((ch) => {
              const active = config.channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const channels = active
                      ? config.channels.filter((c) => c !== ch)
                      : [...config.channels, ch];
                    update({ channels });
                  }}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guardrails: Blocked Topics */}
        <div className="space-y-1">
          <Label className="text-xs">Chủ đề bị chặn (mỗi dòng 1 chủ đề)</Label>
          <Textarea
            value={config.guardrails.blockedTopics.join("\n")}
            onChange={(e) => {
              const blockedTopics = e.target.value
                .split("\n")
                .filter((s) => s.trim());
              update({
                guardrails: { ...config.guardrails, blockedTopics },
              });
            }}
            disabled={disabled}
            rows={3}
            className="text-xs"
            placeholder="VD: chính trị, tôn giáo..."
          />
        </div>

        {/* Guardrails: Escalation Triggers */}
        <div className="space-y-1">
          <Label className="text-xs">Trigger escalation (moi dong 1 trigger)</Label>
          <Textarea
            value={config.guardrails.escalationTriggers.join("\n")}
            onChange={(e) => {
              const escalationTriggers = e.target.value
                .split("\n")
                .filter((s) => s.trim());
              update({
                guardrails: { ...config.guardrails, escalationTriggers },
              });
            }}
            disabled={disabled}
            rows={3}
            className="text-xs"
            placeholder="VD: yêu cầu hoàn tiền, khiếu nại..."
          />
        </div>

        {/* Max Response Length */}
        <div className="space-y-1">
          <Label className="text-xs">Độ dài tối đa response (ký tự)</Label>
          <Input
            type="number"
            min={100}
            max={10000}
            step={100}
            value={config.guardrails.maxResponseLength ?? ""}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              update({
                guardrails: {
                  ...config.guardrails,
                  maxResponseLength: isNaN(val) ? undefined : val,
                },
              });
            }}
            disabled={disabled}
            className="h-8 text-xs"
            placeholder="Để trống = không giới hạn"
          />
        </div>
      </CardContent>
    </Card>
  );
}
