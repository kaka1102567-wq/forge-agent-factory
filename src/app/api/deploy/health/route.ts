import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import { withRole } from "@/lib/auth/helpers";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/deploy/health — Chạy health check cho tất cả active deployments
// Gọi định kỳ (~5 phút) qua cron hoặc manual
export async function GET() {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const activeDeployments = await db.deployment.findMany({
      where: { status: "ACTIVE" },
      include: { agent: true },
    });

    if (activeDeployments.length === 0) {
      return NextResponse.json({
        checked: 0,
        message: "Không có deployment nào đang active",
      });
    }

    const results = [];

    for (const deployment of activeDeployments) {
      const startTime = performance.now();
      let healthStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "DOWN";
      let details: Prisma.InputJsonValue = {};

      try {
        // Gửi test message qua Haiku để kiểm tra agent có respond được không
        const response = await routeTask("classify", "Xin chào, bạn là ai?", {
          system: deployment.agent.systemPrompt,
          maxTokens: 256,
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (response.result && response.result.length > 0) {
          healthStatus = latencyMs < 5000 ? "HEALTHY" : "DEGRADED";
        }

        details = {
          latencyMs,
          responseLength: response.result.length,
          modelUsed: response.modelUsed,
          cost: response.cost,
        };
      } catch (error) {
        healthStatus = "DOWN";
        details = {
          error: error instanceof Error ? error.message : "Unknown error",
          latencyMs: Math.round(performance.now() - startTime),
        };
      }

      // Cập nhật health status trong DB
      await db.deployment.update({
        where: { id: deployment.id },
        data: {
          healthStatus,
          lastHealthCheck: new Date(),
          healthDetails: details,
        },
      });

      results.push({
        deploymentId: deployment.id,
        agentName: deployment.agent.name,
        channel: deployment.channel,
        healthStatus,
        details,
      });
    }

    // Kiểm tra có deployment nào DOWN/DEGRADED → log cảnh báo
    const unhealthy = results.filter(
      (r) => r.healthStatus === "DOWN" || r.healthStatus === "DEGRADED"
    );
    if (unhealthy.length > 0) {
      console.warn(
        `[Health] ${unhealthy.length}/${results.length} deployments unhealthy:`,
        unhealthy.map((u) => `${u.agentName}(${u.channel}): ${u.healthStatus}`)
      );
    }

    return NextResponse.json({
      checked: results.length,
      healthy: results.filter((r) => r.healthStatus === "HEALTHY").length,
      degraded: results.filter((r) => r.healthStatus === "DEGRADED").length,
      down: results.filter((r) => r.healthStatus === "DOWN").length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
