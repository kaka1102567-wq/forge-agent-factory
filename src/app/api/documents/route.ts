import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const documents = await db.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { domain: true },
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const body = await request.json();
  const document = await db.document.create({ data: body });
  return NextResponse.json(document, { status: 201 });
}
