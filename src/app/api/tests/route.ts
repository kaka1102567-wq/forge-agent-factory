import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/auth/helpers";

export async function GET(request: NextRequest) {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const agentId = request.nextUrl.searchParams.get("agentId");

    const results = await db.testResult.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { agent: { include: { domain: true } } },
    });

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
