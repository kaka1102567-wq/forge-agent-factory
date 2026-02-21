import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

// GET /api/users — ADMIN only: danh sách users
export async function GET() {
  const authResult = await withRole(["ADMIN"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
