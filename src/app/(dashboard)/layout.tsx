import Link from "next/link";
import {
  LayoutDashboard,
  Globe,
  FileText,
  Bot,
  FlaskConical,
  Rocket,
  DollarSign,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Domains", href: "/domains", icon: Globe },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Tests", href: "/tests", icon: FlaskConical },
  { label: "Deploy", href: "/deploy", icon: Rocket },
  { label: "Costs", href: "/costs", icon: DollarSign },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card p-4">
        <h1 className="mb-8 text-xl font-bold">FORGE</h1>
        <nav className="space-y-1">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
