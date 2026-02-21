import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/helpers";
import { UserManagement } from "@/components/features/user-management/user-management";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
        <p className="text-muted-foreground">
          Thêm, chỉnh sửa quyền và quản lý tài khoản người dùng
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
