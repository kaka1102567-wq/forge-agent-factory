import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Globe,
  FileText,
  Bot,
  FlaskConical,
  Rocket,
  DollarSign,
  Settings,
} from "lucide-react";
import { auth } from "@/auth";
import { UserMenu } from "@/components/features/auth/user-menu";

const baseNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Quick Mode", href: "/quick", icon: Zap },
  { label: "Domains", href: "/domains", icon: Globe },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Tests", href: "/tests", icon: FlaskConical },
  { label: "Deploy", href: "/deploy", icon: Rocket },
  { label: "Costs", href: "/costs", icon: DollarSign },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const navItems = [
    ...baseNavItems,
    ...(session.user.role === "ADMIN"
      ? [{ label: "Cài đặt", href: "/settings/users", icon: Settings }]
      : []),
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card p-4">
        <h1 className="mb-8 text-xl font-bold">FORGE</h1>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <UserMenu
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
