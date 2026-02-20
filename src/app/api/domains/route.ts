import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const domains = await db.domain.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(domains);
}

export async function POST(request: Request) {
  const body = await request.json();
  const domain = await db.domain.create({ data: body });
  return NextResponse.json(domain, { status: 201 });
}
