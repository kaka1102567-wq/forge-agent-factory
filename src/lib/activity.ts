import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type ActivityType =
  | "deploy"
  | "rollback"
  | "test_run"
  | "quality_score"
  | "status_change"
  | "agent_create"
  | "health_check";

/**
 * Ghi một activity log vào DB (fire-and-forget)
 */
export function logActivity(
  type: ActivityType,
  description: string,
  options?: { agentId?: string; metadata?: Record<string, unknown> }
): void {
  db.activityLog
    .create({
      data: {
        type,
        description,
        agentId: options?.agentId ?? null,
        metadata: (options?.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch((err: unknown) => {
      console.error("[ActivityLog] Failed to save:", err);
    });
}
