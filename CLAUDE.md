# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FORGE Agent Factory

## What is this?
Document-driven AI agent builder platform.

## Tech Stack
- Next.js 15 (App Router, Server Components, Server Actions)
- Prisma ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- Claude API (Haiku/Sonnet/Opus routing)
- BullMQ + Redis (async jobs)
- Deploy: Coolify on Singapore VPS

## Key Patterns
- Server Components by default, "use client" only when needed
- Prisma for all DB access via src/lib/db.ts singleton
- AI calls go through router (src/lib/ai/router.ts)
- Zod validation for all API inputs
- Vietnamese comments for business logic, English for technical

## Current Sprint
Phase 0 - Week 1: Project Setup
