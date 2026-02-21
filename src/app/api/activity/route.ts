import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/activity?limit=20 — Recent activity feed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

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
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
