import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/auth/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const domain = await db.domain.findUnique({ where: { id } });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
