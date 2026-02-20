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
│   ├── (dashboard)/      # Route group: sidebar layout + all pages
│   │   ├── layout.tsx     # Sidebar navigation
│   │   ├── page.tsx       # Dashboard overview
│   │   ├── domains/       # Domain management
│   │   ├── documents/     # Document management
│   │   ├── agents/        # Agent builder
│   │   ├── tests/         # Test runner + results
│   │   └── deploy/        # Deployment
│   └── api/
│       ├── domains/       # CRUD
│       ├── documents/     # CRUD
│       ├── agents/        # CRUD
│       ├── tests/         # Test results
│       └── ai/
│           ├── classify/  # Haiku - phân loại domain/intent
│           ├── generate/  # Sonnet - sinh nội dung
│           ├── score/     # Haiku - chấm điểm chất lượng
│           └── assemble/  # Sonnet - lắp ráp agent
├── lib/
│   ├── db.ts              # Prisma singleton
│   ├── ai/
│   │   ├── client.ts      # Anthropic SDK singleton
│   │   ├── router.ts      # Model tier routing (fast/balanced/powerful)
│   │   └── prompts/       # Prompt templates
│   ├── constants.ts       # App-wide constants
│   └── utils.ts           # cn() helper (shadcn)
└── components/
    ├── ui/                # shadcn components (auto-generated)
    ├── layout/            # App shell components
    └── features/          # Feature-specific components
```

### Data Flow
Domain → Documents (generated via AI) → Agent Assembly → Test → Deploy

### Database Models (Prisma)
6 models: Domain, Template, Document, Agent, TestCase, TestResult.
Schema at `prisma/schema.prisma`. Config at `prisma.config.ts` (Prisma 7 style - DB URL in config, NOT in schema).

## Key Patterns

### Server Components by default
Use `"use client"` only when needed (event handlers, hooks, browser APIs). Keep data fetching in Server Components.

### Prisma singleton
All DB access via `src/lib/db.ts`. Import as `import { db } from "@/lib/db"`.

### AI Model Routing
All AI calls go through `src/lib/ai/router.ts`:
- **fast** (Haiku): classification, scoring, simple extraction
- **balanced** (Sonnet): content generation, agent assembly
- **powerful** (Opus): complex reasoning, quality review

### Validation
Zod for all API input validation. Validate at route handler level before DB operations.

### Env vars
- `DATABASE_URL` - PostgreSQL connection (used in prisma.config.ts)
- `ANTHROPIC_API_KEY` - Claude API key
- `REDIS_URL` - Redis for BullMQ

## Conventions
- Vietnamese comments for business logic, English for technical
- File naming: kebab-case for files, PascalCase for components
- Commit format: `feat(WP-XX): description` / `fix(WP-XX): description`
- shadcn components live in `src/components/ui/` (don't edit manually)
- Use `sonner` for toast notifications (not deprecated `toast`)

## Current Sprint
Phase 0 - Week 1: Project Setup
