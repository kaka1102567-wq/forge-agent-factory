"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { WizardStepper } from "./wizard-stepper";
import { StepDescribe, type DescribeFormData } from "./step-describe";
import { StepClassify, type ClassificationData } from "./step-classify";
import { StepConfirm } from "./step-confirm";

const STEPS = [
  { label: "Mô tả", description: "Nhập thông tin domain" },
  { label: "Phân tích AI", description: "Xác nhận kết quả" },
  { label: "Xác nhận", description: "Tạo domain" },
];

const DEFAULT_FORM: DescribeFormData = {
  description: "",
  companyName: "",
  industry: "",
  channels: [],
};

const DEFAULT_CLASSIFICATION: ClassificationData = {
  industry: "",
  function: "",
  specialization: "",
  channels: [],
  tone: "",
  confidence: 0,
  reasoning: "",
};

export function DomainWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<DescribeFormData>(DEFAULT_FORM);
  const [classification, setClassification] =
    useState<ClassificationData>(DEFAULT_CLASSIFICATION);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 → 2: Gọi AI classify
  const handleClassify = async () => {
    setIsClassifying(true);
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription: formData.description,
          companyName: formData.companyName || undefined,
          industry: formData.industry || undefined,
          channels: formData.channels.length ? formData.channels : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi phân tích AI");
      }

      const { classification: result } = await res.json();
      setClassification({
        industry: result.industry ?? "",
        function: result.function ?? "",
        specialization: result.specialization ?? "",
        channels: result.channels ?? formData.channels,
        tone: result.tone ?? "professional",
        confidence: result.confidence ?? 0,
        reasoning: result.reasoning ?? "",
      });
      setCurrentStep(1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(message);
    } finally {
      setIsClassifying(false);
    }
  };

  // Step 3: Lưu domain vào DB
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const domainName =
        formData.companyName ||
        classification.specialization.replace(/_/g, " ");

      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: domainName,
          industry: classification.industry,
          function: classification.function,
          channels: classification.channels,
          tone: classification.tone,
          profile: {
            description: formData.description,
            companyName: formData.companyName,
            specialization: classification.specialization,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi lưu domain");
      }

      toast.success("Domain đã được tạo thành công!");
      router.push("/domains");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepper steps={STEPS} currentStep={currentStep} />

      {currentStep === 0 && (
        <StepDescribe
          data={formData}
          onChange={setFormData}
          onNext={handleClassify}
          isLoading={isClassifying}
        />
      )}

      {currentStep === 1 && (
        <StepClassify
          data={classification}
          onChange={setClassification}
          onBack={() => setCurrentStep(0)}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <StepConfirm
          formData={formData}
          classification={classification}
          onBack={() => setCurrentStep(1)}
          onSubmit={handleSave}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
