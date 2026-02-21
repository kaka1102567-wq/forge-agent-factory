import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { withRole } from "@/lib/auth/helpers";

// Zod schema cho tạo domain
const CreateDomainSchema = z.object({
  name: z.string().min(1, "Tên domain không được trống"),
  industry: z.string().min(1, "Ngành nghề không được trống"),
  function: z.string().min(1, "Chức năng không được trống"),
  channels: z.array(z.string()).min(1, "Cần ít nhất 1 kênh"),
  tone: z.string().min(1, "Giọng điệu không được trống"),
  profile: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET() {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const domains = await db.domain.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(domains);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await withRole(["ADMIN", "EDITOR"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const parsed = CreateDomainSchema.parse(body);

    const domain = await db.domain.create({
      data: {
        ...parsed,
        profile: parsed.profile as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json(domain, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
