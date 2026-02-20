import { DomainWizard } from "@/components/features/domain-wizard/domain-wizard";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function NewDomainPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/domains" className="hover:text-foreground">
          Domains
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Tạo mới</span>
      </nav>

      <h2 className="mb-6 text-2xl font-bold">Tạo Domain mới</h2>
      <DomainWizard />
    </div>
  );
}
