import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
};

export type AuthResult = { user: AuthUser };

/**
 * Kiểm tra auth + role cho API routes
 * Trả về session user nếu hợp lệ, hoặc NextResponse 401/403
 */
export async function withRole(
  allowedRoles: string[]
): Promise<AuthResult | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 }
    );
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role,
    },
  };
}

/**
 * Lấy user hiện tại cho Server Components
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}
