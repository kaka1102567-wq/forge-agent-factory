"use client";

import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-red-500/10 text-red-600 border-red-200",
  EDITOR: "bg-blue-500/10 text-blue-600 border-blue-200",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

type UserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">
            {user.name || "User"}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_STYLES[user.role] || ""}`}>
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
