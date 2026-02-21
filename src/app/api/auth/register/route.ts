import { NextResponse } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const RegisterSchema = z.object({
  name: z.string().min(1, "Họ tên không được trống"),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.parse(body);

    // Kiểm tra email đã tồn tại
    const existing = await db.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 400 }
      );
    }

    // User đầu tiên → ADMIN, sau đó → VIEWER
    const userCount = await db.user.count();
    const role = userCount === 0 ? "ADMIN" : "VIEWER";

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
