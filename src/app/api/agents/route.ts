import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { domain: true },
  });
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const body = await request.json();
  const agent = await db.agent.create({ data: body });
  return NextResponse.json(agent, { status: 201 });
}
