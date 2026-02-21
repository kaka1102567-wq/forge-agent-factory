import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
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
