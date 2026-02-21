import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type ActivityType =
  | "deploy"
  | "rollback"
  | "test_run"
  | "test_complete"
  | "quality_score"
  | "status_change"
  | "agent_create"
  | "agent_assemble"
  | "doc_generate"
  | "health_check"
  | "quick_build";

/**
 * Ghi một activity log vào DB (fire-and-forget)
 */
export function logActivity(
  type: ActivityType,
  description: string,
  options?: {
    agentId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  db.activityLog
    .create({
      data: {
        type,
        description,
        agentId: options?.agentId ?? null,
        userId: options?.userId ?? null,
        metadata: (options?.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch((err: unknown) => {
      console.error("[ActivityLog] Failed to save:", err);
    });
}
