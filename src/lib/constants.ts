// Domain archetypes - Các kiểu agent có sẵn
export const AGENT_ARCHETYPES = [
  "sales",
  "support",
  "onboarding",
  "marketing",
  "hr",
  "education",
] as const;

// Document categories - Phân loại tài liệu
export const DOCUMENT_CATEGORIES = [
  "greeting",
  "faq",
  "objection-handling",
  "closing",
  "follow-up",
  "escalation",
] as const;

// Template types
export const TEMPLATE_TYPES = [
  "system-prompt",
  "response",
  "workflow",
  "evaluation",
] as const;

// Quality score thresholds - Ngưỡng chất lượng
export const QUALITY_THRESHOLDS = {
  MIN_PASS: 70,
  GOOD: 80,
  EXCELLENT: 90,
} as const;

// Navigation items for dashboard sidebar
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Domains", href: "/domains", icon: "Globe" },
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Agents", href: "/agents", icon: "Bot" },
  { label: "Tests", href: "/tests", icon: "FlaskConical" },
  { label: "Deploy", href: "/deploy", icon: "Rocket" },
] as const;
