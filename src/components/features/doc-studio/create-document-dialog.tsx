"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, FileText } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  type: string;
}

interface CreateDocumentDialogProps {
  domainId: string;
  templates: Template[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDocumentDialog({
  domainId,
  templates,
  open,
  onOpenChange,
}: CreateDocumentDialogProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedTemplateId) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, templateId: selectedTemplateId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const data = await res.json();
      toast.success("Da tao document thanh cong!");
      onOpenChange(false);
      router.push(`/documents/${data.document.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Loi khi tao document"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tao document moi</DialogTitle>
        </DialogHeader>

        {isCreating ? (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-3">
              <Sparkles className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">
                AI dang tao noi dung...
              </p>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Chon template de AI sinh noi dung tu dong.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplateId === template.id
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Huy
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedTemplateId}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Tao
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
