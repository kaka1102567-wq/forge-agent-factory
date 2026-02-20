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
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { DescribeFormData } from "./step-describe";
import type { ClassificationData } from "./step-classify";

interface StepConfirmProps {
  formData: DescribeFormData;
  classification: ClassificationData;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function StepConfirm({
  formData,
  classification,
  onBack,
  onSubmit,
  isLoading,
}: StepConfirmProps) {
  const domainName =
    formData.companyName || classification.specialization.replace(/_/g, " ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xác nhận tạo Domain</CardTitle>
        <CardDescription>
          Kiểm tra thông tin bên dưới trước khi tạo domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 text-lg font-semibold">{domainName}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {formData.description.length > 200
              ? formData.description.slice(0, 200) + "..."
              : formData.description}
          </p>
          <div className="divide-y">
            <InfoRow
              label="Ngành nghề"
              value={classification.industry.replace(/_/g, " ")}
            />
            <InfoRow label="Chức năng" value={classification.function} />
            <InfoRow
              label="Chuyên môn"
              value={classification.specialization.replace(/_/g, " ")}
            />
            <InfoRow label="Giọng điệu" value={classification.tone} />
            <InfoRow
              label="Kênh triển khai"
              value={
                <div className="flex flex-wrap justify-end gap-1">
                  {classification.channels.map((ch) => (
                    <Badge key={ch} variant="secondary">
                      {ch}
                    </Badge>
                  ))}
                </div>
              }
            />
            <InfoRow
              label="Độ tin cậy"
              value={
                <Badge
                  variant={
                    classification.confidence >= 0.8 ? "default" : "secondary"
                  }
                >
                  {Math.round(classification.confidence * 100)}%
                </Badge>
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button onClick={onSubmit} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Tạo Domain
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
