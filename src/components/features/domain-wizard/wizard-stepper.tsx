"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={step.label} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={cn(
                    "h-px w-12 sm:w-20",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-2 border-primary bg-background text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "border border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <div className="hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
