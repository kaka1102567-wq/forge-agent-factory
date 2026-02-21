import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { MAX_VERSION_HISTORY } from "@/lib/constants";
import { withRole } from "@/lib/auth/helpers";

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  status: z.enum(["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withRole(["ADMIN", "EDITOR", "VIEWER"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const document = await db.document.findUniqueOrThrow({
      where: { id },
      include: { domain: true, template: true },
    });
    return NextResponse.json(document);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withRole(["ADMIN", "EDITOR"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateDocumentSchema.parse(body);

    // Fetch current document cho version history
    const current = await db.document.findUniqueOrThrow({
      where: { id },
    });

    // Build version history entry nếu content thay đổi
    const updateData: Record<string, unknown> = { ...data };

    if (data.content && data.content !== current.content) {
      // Push current version vào history trước khi update
      const history = (current.versionHistory as Array<Record<string, unknown>>) ?? [];
      const newEntry = {
        version: current.version,
        content: current.content,
        savedAt: new Date().toISOString(),
      };

      // Cap tại MAX_VERSION_HISTORY entries
      const updatedHistory = [...history, newEntry].slice(-MAX_VERSION_HISTORY);

      updateData.versionHistory = updatedHistory;
      updateData.version = current.version + 1;
    }

    const document = await db.document.update({
      where: { id },
      data: updateData,
      include: { domain: true, template: true },
    });

    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
