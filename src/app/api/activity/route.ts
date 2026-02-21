import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { withRole } from "@/lib/auth/helpers";

const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  userId: z.string().optional(),
});

// GET /api/activity?limit=20&userId=xxx — Recent activity feed
export async function GET(request: Request) {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const { limit, userId } = ActivityQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
    });

    const activities = await db.activityLog.findMany({
      where: userId ? { userId } : undefined,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const serialized = activities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      metadata: a.metadata,
      agentName: a.agent?.name ?? null,
      userName: a.user?.name ?? null,
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
