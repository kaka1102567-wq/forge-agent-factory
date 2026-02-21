import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { withRole } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

const UpdateUserSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

// PATCH /api/users/[id] — ADMIN only: cập nhật role, active, name
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withRole(["ADMIN"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateUserSchema.parse(body);

    // Không cho phép tự deactivate
    if (data.active === false && id === authResult.user.id) {
      return NextResponse.json(
        { error: "Không thể vô hiệu hóa tài khoản của chính mình" },
        { status: 400 }
      );
    }

    // Không cho phép hạ quyền admin cuối cùng
    if (data.role && data.role !== "ADMIN") {
      const targetUser = await db.user.findUnique({ where: { id } });
      if (targetUser?.role === "ADMIN") {
        const adminCount = await db.user.count({
          where: { role: "ADMIN", active: true },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "Cần ít nhất 1 admin trong hệ thống" },
            { status: 400 }
          );
        }
      }
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
