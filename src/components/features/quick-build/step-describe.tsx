"use client";

import { useState } from "react";
import { Zap, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CHANNELS } from "@/lib/constants";

interface StepDescribeProps {
  onSubmit: (data: {
    businessDescription: string;
    channels: string[];
  }) => void;
}

export function StepDescribe({ onSubmit }: StepDescribeProps) {
  const [description, setDescription] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["website"]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const canSubmit = description.trim().length >= 10 && selectedChannels.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Quick Mode</h2>
        <p className="mt-1 text-muted-foreground">
          Mô tả doanh nghiệp, AI sẽ tự động tạo agent trong vài phút.
        </p>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <label className="mb-2 block text-sm font-medium">
            Mô tả doanh nghiệp / sản phẩm
          </label>
          <Textarea
            placeholder="Ví dụ: Agency marketing 50 nhân sự, chuyên chạy ads Facebook/Google. Cần Sales Agent tự qualify leads từ form, gửi proposal, follow up đến closing. Hoặc: Chuỗi F&B 20 chi nhánh cần Operations Agent giám sát inventory, đề xuất order, phân tích doanh thu..."
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Càng chi tiết, agent càng thông minh. Tối thiểu 10 ký tự.
          </p>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardContent className="pt-6">
          <label className="mb-3 block text-sm font-medium">
            Kênh triển khai
          </label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <Badge
                key={ch}
                variant={selectedChannels.includes(ch) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleChannel(ch)}
              >
                {selectedChannels.includes(ch) ? (
                  <X className="mr-1 h-3 w-3" />
                ) : (
                  <Plus className="mr-1 h-3 w-3" />
                )}
                {ch}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        disabled={!canSubmit}
        onClick={() =>
          onSubmit({
            businessDescription: description.trim(),
            channels: selectedChannels,
          })
        }
      >
        <Zap className="mr-2 h-5 w-5" />
        Build ngay!
      </Button>
    </div>
  );
}
