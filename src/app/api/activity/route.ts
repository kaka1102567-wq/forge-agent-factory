import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";

const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// GET /api/activity?limit=20 — Recent activity feed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit } = ActivityQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
    });

    const activities = await db.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { id: true, name: true } },
      },
    });

    const serialized = activities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      metadata: a.metadata,
      agentName: a.agent?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
