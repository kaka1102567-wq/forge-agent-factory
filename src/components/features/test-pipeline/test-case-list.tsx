"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TestCaseItem {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  score: number | null;
  passed: boolean | null;
  reasoning: string | null;
  category: string;
}

interface TestCaseListProps {
  cases: TestCaseItem[];
}

export function TestCaseList({ cases }: TestCaseListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cases.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Chua co test case.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 px-2 py-2" />
            <th className="px-3 py-2 text-left font-medium">Input</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">
              Category
            </th>
            <th className="px-3 py-2 text-center font-medium">Diem</th>
            <th className="px-3 py-2 text-center font-medium">Ket qua</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((tc) => (
            <>
              <tr
                key={tc.id}
                className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                onClick={() =>
                  setExpandedId(expandedId === tc.id ? null : tc.id)
                }
              >
                <td className="px-2 py-2 text-muted-foreground">
                  {expandedId === tc.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </td>
                <td className="max-w-[300px] truncate px-3 py-2">
                  {tc.input}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {tc.category}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-center">
                  {tc.score !== null ? (
                    <span
                      className={
                        tc.score >= 80
                          ? "text-emerald-600"
                          : tc.score >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }
                    >
                      {tc.score}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {tc.passed === true && (
                    <Badge variant="default" className="bg-emerald-600 text-xs">
                      Pass
                    </Badge>
                  )}
                  {tc.passed === false && (
                    <Badge variant="default" className="bg-red-600 text-xs">
                      Fail
                    </Badge>
                  )}
                  {tc.passed === null && (
                    <Badge variant="outline" className="text-xs">
                      Cho
                    </Badge>
                  )}
                </td>
              </tr>
              {expandedId === tc.id && (
                <tr key={`${tc.id}-detail`} className="border-b bg-muted/10">
                  <td colSpan={5} className="px-6 py-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Mong doi:</span>{" "}
                        <span className="text-muted-foreground">
                          {tc.expectedOutput}
                        </span>
                      </div>
                      {tc.actualOutput && (
                        <div>
                          <span className="font-medium">Thuc te:</span>{" "}
                          <span className="text-muted-foreground">
                            {tc.actualOutput.length > 500
                              ? tc.actualOutput.slice(0, 500) + "..."
                              : tc.actualOutput}
                          </span>
                        </div>
                      )}
                      {tc.reasoning && (
                        <div>
                          <span className="font-medium">Ly do:</span>{" "}
                          <span className="text-muted-foreground">
                            {tc.reasoning}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
