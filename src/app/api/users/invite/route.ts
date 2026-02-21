import { NextResponse } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { withRole } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

const InviteSchema = z.object({
  email: z.email("Email không hợp lệ"),
  name: z.string().min(1, "Họ tên không được trống"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

// POST /api/users/invite — ADMIN only: tạo user mới với mật khẩu tạm
export async function POST(request: Request) {
  const authResult = await withRole(["ADMIN"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const data = InviteSchema.parse(body);

    // Kiểm tra email trùng
    const existing = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 400 }
      );
    }

    // Tạo mật khẩu tạm = 6 ký tự ngẫu nhiên
    const tempPassword = Math.random().toString(36).slice(2, 8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ...user, tempPassword },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
