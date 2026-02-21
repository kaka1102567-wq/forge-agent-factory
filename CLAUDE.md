# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FORGE Agent Factory

## What is this?
Document-driven AI agent builder platform. Takes domain knowledge → generates documents → assembles AI agents → tests → deploys.

## Tech Stack
- Next.js 15 (App Router, Server Components, Server Actions)
- Prisma ORM (v7) + PostgreSQL
- Tailwind CSS v4 + shadcn/ui
- Claude API (Haiku/Sonnet/Opus routing)
- BullMQ + Redis (async jobs)
- Deploy: Coolify on Singapore VPS

## Commands
```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npm test           # Vitest run
npm run test:watch # Vitest watch mode
npx prisma validate       # Validate schema
npx prisma generate       # Generate Prisma client (output: src/generated/prisma)
npx prisma migrate dev    # Create + apply migration
npx prisma studio         # DB GUI
```

## Architecture

### Directory Structure
```
src/
├── app/
│   ├── (auth)/            # Auth pages: login, register
│   ├── (dashboard)/       # Route group: sidebar layout + all pages
│   │   ├── layout.tsx     # Sidebar navigation (role-filtered)
│   │   ├── page.tsx       # Dashboard: 4 stat cards + agent grid + activity feed
│   │   ├── domains/       # Domain management + wizard
│   │   ├── documents/     # Document studio (Tiptap editor)
│   │   ├── agents/        # Agent builder + assembly
│   │   ├── tests/         # 6-round test runner + results
│   │   ├── deploy/        # Deployment center + health monitor
│   │   ├── quick/         # Quick Mode: 1-click agent builder
│   │   ├── costs/         # Cost dashboard (Recharts)
│   │   └── settings/      # User management (ADMIN only)
│   └── api/
│       ├── auth/          # NextAuth v5 + register
│       ├── domains/       # CRUD + classification
│       ├── documents/     # CRUD + generation + scoring
│       ├── agents/        # CRUD + assembly
│       ├── tests/         # Test generation + SSE runner
│       ├── deploy/        # Deploy + rollback + health
│       ├── channels/      # Telegram webhook + Web CORS endpoint
│       ├── quick-build/   # Quick Mode SSE pipeline
│       ├── users/         # User management + invite (ADMIN)
│       ├── costs/         # Cost analytics
│       ├── stats/         # Dashboard stats
│       ├── activity/      # Activity feed
│       └── ai/
│           ├── classify/  # Haiku - phân loại domain/intent
│           ├── generate/  # Sonnet - sinh nội dung
│           ├── score/     # Haiku - chấm điểm chất lượng
│           ├── assemble/  # Opus - lắp ráp agent prompt
│           ├── test-generate/ # Sonnet - sinh test cases
│           └── chat-preview/  # Sonnet - preview chat
├── lib/
│   ├── db.ts              # Prisma singleton (v7 adapter pattern)
│   ├── activity.ts        # ActivityLog helper (fire-and-forget)
│   ├── auth.ts            # NextAuth v5 config
│   ├── auth.config.ts     # Auth callbacks + JWT
│   ├── ai/
│   │   ├── client.ts      # OpenAI SDK singleton (Claudible proxy) + retry + stripMarkdownJson
│   │   ├── router.ts      # TaskType→ModelTier routing + fallback chain + CostLog
│   │   ├── cost.ts        # Cost calculation per model tier
│   │   ├── test-runner.ts # Test execution helper
│   │   ├── safety-tests.ts # 50 Vietnamese safety test cases
│   │   ├── __tests__/     # Vitest unit tests
│   │   └── prompts/       # Typed prompt templates (Zod schemas)
│   │       ├── domain-classify.ts   # Haiku
│   │       ├── doc-generate.ts      # Sonnet
│   │       ├── quality-score.ts     # Haiku
│   │       ├── agent-assemble.ts    # Opus
│   │       ├── test-generate.ts     # Sonnet (6 rounds)
│   │       ├── test-judge.ts        # Haiku
│   │       └── quick-doc-generate.ts # Sonnet (3 mini-docs)
│   ├── auth/helpers.ts    # withRole() RBAC helper
│   ├── schemas/           # Zod validation schemas
│   ├── constants.ts       # App-wide constants
│   └── utils.ts           # cn() helper (shadcn)
├── middleware.ts           # Auth middleware (excludes /api/auth, /api/channels)
└── components/
    ├── ui/                # shadcn components (auto-generated)
    ├── layout/            # App shell components
    └── features/          # Feature-specific components
```

### Data Flow
Domain → Documents (generated via AI) → Agent Assembly → Test → Deploy

### Database Models (Prisma)
12 models: User, Account, Domain, Template, Document, Agent, TestCase, TestResult, Deployment, CostLog, ActivityLog + 7 enums.
Schema at `prisma/schema.prisma`. Config at `prisma.config.ts` (Prisma 7 style - DB URL in config, NOT in schema).

## Key Patterns

### Server Components by default
Use `"use client"` only when needed (event handlers, hooks, browser APIs). Keep data fetching in Server Components.

### Prisma singleton
All DB access via `src/lib/db.ts`. Import as `import { db } from "@/lib/db"`.

### AI Model Routing
All AI calls go through `routeTask()` in `src/lib/ai/router.ts`:
- **TaskType → ModelTier** routing (not manual tier selection):
  - `classify`, `score`, `route`, `test_judge` → Haiku
  - `generate`, `draft`, `analyze` → Sonnet
  - `assemble`, `review` → Opus
- **Fallback chain**: opus → sonnet → haiku (on 529/500 errors)
- **Client** (`src/lib/ai/client.ts`): OpenAI SDK → Claudible proxy, retry (3x exponential backoff), timeout (30s/60s/90s), error classification
- **Cost tracking** (`src/lib/ai/cost.ts`): per-request cost calculation, daily totals
- **Prompt registry** (`src/lib/ai/prompts/`): typed prompts with Zod input/output schemas
  - `domain-classify.ts` — Haiku: phân loại industry/function/specialization
  - `doc-generate.ts` — Sonnet: sinh tài liệu từ template + domain
  - `quality-score.ts` — Haiku: chấm điểm 0-100
  - `agent-assemble.ts` — Opus: lắp ráp system prompt từ docs
- Usage: `import { routeTask } from "@/lib/ai/router"` → `routeTask("classify", input, { system, maxTokens })`

### Validation
Zod for all API input validation. Validate at route handler level before DB operations.

### Auth & RBAC
- NextAuth v5 (Credentials + Google OAuth), JWT sessions
- 3 roles: ADMIN (full access), EDITOR (create/edit), VIEWER (read-only)
- `withRole()` helper enforces RBAC on all 27 protected API routes
- 4 public routes: `/api/auth/*`, `/api/channels/*`
- First registered user → ADMIN, subsequent → VIEWER

### Env vars
- `DATABASE_URL` - PostgreSQL connection (used in prisma.config.ts)
- `ANTHROPIC_API_KEY` - Claude API key (used by OpenAI SDK via proxy)
- `ANTHROPIC_BASE_URL` - Claudible proxy URL (optional, defaults to api.anthropic.com)
- `REDIS_URL` - Redis for BullMQ
- `AUTH_SECRET` - NextAuth session encryption
- `AUTH_URL` - NextAuth callback URL
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth (optional)

## Conventions
- Vietnamese comments for business logic, English for technical
- File naming: kebab-case for files, PascalCase for components
- Commit format: `feat(WP-XX): description` / `fix(WP-XX): description`
- shadcn components live in `src/components/ui/` (don't edit manually)
- Use `sonner` for toast notifications (not deprecated `toast`)

## Known Issues
- Prisma v7 PrismaClient cần `@prisma/adapter-pg` — `db.ts` đã setup adapter pattern, seed.ts dùng `as any` cast do ESM/CJS type mismatch
- ESLint config `core-web-vitals` import path cần fix cho eslint-config-next mới

## Current Sprint
All WPs complete (WP-00 → WP-09). Project in final audit phase.

## Final Audit Results (2026-02-21)

### Score: 9.2/10 — Production Ready
- **WPs completed**: 10/10 (WP-00 → WP-09)
- **Build**: PASS (0 errors)
- **Schema**: Valid (12 models, 7 enums)
- **API routes**: 31 total (27 protected, 4 public)
- **Critical blockers**: 0

### Fixes Applied
1. Removed unused `@anthropic-ai/sdk` dependency
2. Replaced `Math.random()` with `crypto.randomBytes()` for temp password generation
3. Added Prisma indexes on `Document.domainId`, `Agent.domainId`, `TestCase.agentId`
4. Updated CLAUDE.md with complete architecture documentation

### WP Summary
| WP | Feature | Status |
|----|---------|--------|
| WP-00 | Project Foundation | PASS |
| WP-01 | AI Router + Claudible Proxy | PASS |
| WP-02 | Domain Wizard | PASS |
| WP-03 | Doc Generation + Studio | PASS |
| WP-04 | Agent Assembly Engine | PASS |
| WP-05 | 6-Round Testing Pipeline | PASS |
| WP-06 | Deploy Center + Channels | PASS |
| WP-07 | Dashboard + Cost Monitor | PASS |
| WP-08 | Quick Mode (1-Click) | PASS |
| WP-09 | Auth + RBAC | PASS |
