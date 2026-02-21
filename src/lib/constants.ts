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

// Industries - Ngành nghề kinh doanh
export const INDUSTRIES = [
  "ecommerce",
  "healthcare",
  "education",
  "fintech",
  "real_estate",
  "saas",
  "retail",
  "hospitality",
  "logistics",
  "media",
  "legal",
  "insurance",
  "manufacturing",
  "other",
] as const;

// Channels - Kênh triển khai agent
export const CHANNELS = [
  "website",
  "zalo",
  "messenger",
  "telegram",
  "email",
  "phone",
  "livechat",
  "api",
] as const;

// Tones - Giọng điệu agent
export const TONES = [
  "formal",
  "friendly",
  "professional",
  "casual",
  "empathetic",
  "authoritative",
] as const;

// Quality score thresholds - Ngưỡng chất lượng
export const QUALITY_THRESHOLDS = {
  MIN_PASS: 70,
  GOOD: 80,
  EXCELLENT: 90,
} as const;

// Document version history
export const MAX_VERSION_HISTORY = 10;

// Auto-save interval (30 giây)
export const AUTO_SAVE_INTERVAL_MS = 30_000;

// Chat preview giới hạn số lượt gửi
export const CHAT_PREVIEW_MAX_MESSAGES = 10;

// Navigation items for dashboard sidebar
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Domains", href: "/domains", icon: "Globe" },
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Agents", href: "/agents", icon: "Bot" },
  { label: "Tests", href: "/tests", icon: "FlaskConical" },
  { label: "Deploy", href: "/deploy", icon: "Rocket" },
] as const;
