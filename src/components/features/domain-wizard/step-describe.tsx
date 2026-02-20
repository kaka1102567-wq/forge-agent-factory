"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { CHANNELS, INDUSTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export interface DescribeFormData {
  description: string;
  companyName: string;
  industry: string;
  channels: string[];
}

interface StepDescribeProps {
  data: DescribeFormData;
  onChange: (data: DescribeFormData) => void;
  onNext: () => void;
  isLoading: boolean;
}

export function StepDescribe({
  data,
  onChange,
  onNext,
  isLoading,
}: StepDescribeProps) {
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (data.description.trim().length < 10) {
      setError("Mô tả cần ít nhất 10 ký tự");
      return;
    }
    setError("");
    onNext();
  };

  const toggleChannel = (channel: string) => {
    const channels = data.channels.includes(channel)
      ? data.channels.filter((c) => c !== channel)
      : [...data.channels, channel];
    onChange({ ...data, channels });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mô tả domain kinh doanh</CardTitle>
        <CardDescription>
          Mô tả chi tiết về lĩnh vực kinh doanh, đối tượng khách hàng và mục
          tiêu sử dụng AI agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mô tả domain */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Mô tả domain <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Ví dụ: Công ty bán lẻ thời trang online, phục vụ khách hàng nữ 18-35 tuổi. Cần agent hỗ trợ tư vấn size, chất liệu và xử lý đổi trả..."
            className="min-h-32"
            value={data.description}
            onChange={(e) =>
              onChange({ ...data, description: e.target.value })
            }
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Company name + Industry */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Tên công ty</Label>
            <Input
              id="companyName"
              placeholder="VD: Thời Trang ABC"
              value={data.companyName}
              onChange={(e) =>
                onChange({ ...data, companyName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Ngành nghề</Label>
            <Select
              value={data.industry}
              onValueChange={(value) =>
                onChange({ ...data, industry: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn ngành nghề" />
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

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Phân tích với AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
