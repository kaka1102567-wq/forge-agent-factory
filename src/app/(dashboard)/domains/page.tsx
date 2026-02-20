export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { DomainListTable } from "@/components/features/domain-wizard/domain-list-table";
import { db } from "@/lib/db";
import { Globe, Plus } from "lucide-react";
import Link from "next/link";

export default async function DomainsPage() {
  const domains = await db.domain.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Domains</h2>
          <p className="text-sm text-muted-foreground">
            Quản lý domain và cấu hình agent theo ngành.
          </p>
        </div>
        <Button asChild>
          <Link href="/domains/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo Domain mới
          </Link>
        </Button>
      </div>

      {domains.length > 0 ? (
        <DomainListTable
          domains={domains.map((d) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Chưa có domain nào</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Tạo domain đầu tiên để bắt đầu xây dựng AI agent.
          </p>
          <Button asChild>
            <Link href="/domains/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo Domain mới
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
