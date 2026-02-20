"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNELS, INDUSTRIES, TONES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import type { DomainClassifyOutput } from "@/lib/ai/prompts/domain-classify";

export interface ClassificationData {
  industry: string;
  function: string;
  specialization: string;
  channels: string[];
  tone: string;
  confidence: number;
  reasoning: string;
}

interface StepClassifyProps {
  data: ClassificationData;
  onChange: (data: ClassificationData) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepClassify({
  data,
  onChange,
  onBack,
  onNext,
}: StepClassifyProps) {
  const confidencePercent = Math.round(data.confidence * 100);

  const toggleChannel = (channel: string) => {
    const channels = data.channels.includes(channel)
      ? data.channels.filter((c) => c !== channel)
      : [...data.channels, channel];
    onChange({ ...data, channels });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Kết quả phân tích AI
          <Badge
            variant={
              confidencePercent >= 80
                ? "default"
                : confidencePercent >= 60
                  ? "secondary"
                  : "outline"
            }
          >
            {confidencePercent}% tin cậy
          </Badge>
        </CardTitle>
        <CardDescription>{data.reasoning}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Độ tin cậy</span>
            <span>{confidencePercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                confidencePercent >= 80
                  ? "bg-primary"
                  : confidencePercent >= 60
                    ? "bg-yellow-500"
                    : "bg-destructive"
              )}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Industry + Function + Specialization */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Ngành nghề</Label>
            <Select
              value={data.industry}
              onValueChange={(v) => onChange({ ...data, industry: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chức năng</Label>
            <Input
              value={data.function}
              onChange={(e) =>
                onChange({ ...data, function: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Chuyên môn</Label>
            <Input
              value={data.specialization}
              onChange={(e) =>
                onChange({ ...data, specialization: e.target.value })
              }
            />
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label>Giọng điệu</Label>
          <Select
            value={data.tone}
            onValueChange={(v) => onChange({ ...data, tone: v })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <Label>Kênh triển khai</Label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  data.channels.includes(channel)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sửa lại
          </Button>
          <Button onClick={onNext}>
            <Check className="mr-2 h-4 w-4" />
            Xác nhận
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
