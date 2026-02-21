"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateDocumentDialog } from "@/components/features/doc-studio/create-document-dialog";
import { Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  type: string;
}

interface DomainDocumentsActionsProps {
  domainId: string;
  templates: Template[];
}

export function DomainDocumentsActions({
  domainId,
  templates,
}: DomainDocumentsActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Tao document moi
      </Button>
      <CreateDocumentDialog
        domainId={domainId}
        templates={templates}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
