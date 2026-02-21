"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-red-500/10 text-red-600 border-red-200",
  EDITOR: "bg-blue-500/10 text-blue-600 border-blue-200",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      toast.success("Đã cập nhật quyền");
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Không thể cập nhật");
    }
  }

  async function handleToggleActive(userId: string, active: boolean) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });

    if (res.ok) {
      toast.success(active ? "Đã vô hiệu hóa" : "Đã kích hoạt lại");
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Không thể cập nhật");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Mời người dùng
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Người dùng
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Quyền
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {user.name?.charAt(0)?.toUpperCase() ||
                        user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {user.name || "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role}
                    onValueChange={(val) => handleRoleChange(user.id, val)}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      user.active
                        ? "bg-green-500/10 text-green-600 border-green-200"
                        : "bg-gray-500/10 text-gray-500 border-gray-200"
                    }
                  >
                    {user.active ? "Hoạt động" : "Vô hiệu"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleToggleActive(user.id, user.active)
                    }
                  >
                    {user.active ? "Vô hiệu hóa" : "Kích hoạt"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ email: data.email, tempPassword: data.tempPassword });
        toast.success("Đã tạo tài khoản");
        onSuccess();
      } else {
        toast.error(data.error || "Không thể mời");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setName("");
    setEmail("");
    setRole("VIEWER");
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời người dùng</DialogTitle>
          <DialogDescription>
            Tạo tài khoản mới và chia sẻ thông tin đăng nhập
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Email: </span>
                <strong>{result.email}</strong>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Mật khẩu tạm: </span>
                <code className="rounded bg-primary/10 px-2 py-0.5 font-mono text-primary">
                  {result.tempPassword}
                </code>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Chia sẻ thông tin này cho người dùng. Họ nên đổi mật khẩu sau
              khi đăng nhập lần đầu.
            </p>
            <Button onClick={handleClose} className="w-full">
              Đóng
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">Họ tên</Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Quyền</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
