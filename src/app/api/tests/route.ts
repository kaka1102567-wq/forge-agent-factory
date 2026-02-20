import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const results = await db.testResult.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  });
  return NextResponse.json(results);
}
