import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";

const CreateDocumentSchema = z.object({
  domainId: z.string().min(1),
  templateId: z.string().optional(),
  title: z.string().min(1),
  content: z.string(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");

    const documents = await db.document.findMany({
      where: domainId ? { domainId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { domain: true, template: true },
    });

    return NextResponse.json(documents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreateDocumentSchema.parse(body);

    const document = await db.document.create({
      data,
      include: { domain: true, template: true },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
