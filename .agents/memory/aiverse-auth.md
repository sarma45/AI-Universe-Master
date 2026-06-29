---
name: AIVerse auth integration
description: JWT auth added to existing Vite+React+Express stack (NOT Next.js); covers DB tables, backend routes, frontend hooks
---

# AIVerse Auth Integration

**Stack kept as Vite+React frontend + Express backend** (spec described Next.js but existing codebase is Vite — do NOT convert).

## DB tables added (Drizzle, lib/db/src/schema/users.ts)
- `usersTable` — id, name, email, password (hashed), role enum (USER/ADMIN/SUPER_ADMIN), plan enum (FREE/PRO/ENTERPRISE)
- `userAgentsTable` — user-owned agents (different from swarm agents in swarm tables)

**Why:** The Prisma schema in the spec cannot be used as-is since the existing stack uses Drizzle ORM.

## Backend routes added (artifacts/api-server/src/)
- `routes/auth.ts` — POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- `routes/agents.ts` — GET/POST/PUT/DELETE /api/agents (JWT-protected)
- `routes/ai.ts` — POST /api/ai/chat (SSE streaming to OpenRouter)
- Uses `bcryptjs` (NOT bcrypt) + `jsonwebtoken`
- JWT_SECRET defaults to a dev secret if env not set

## Frontend additions (artifacts/aiverse/src/)
- `lib/auth.ts` — fetch helpers + localStorage token/user storage
- `hooks/useAuth.ts` — React hook for auth state
- Pages: `landing.tsx`, `login.tsx`, `register.tsx`, `agents.tsx`, `workspace.tsx`, `billing.tsx`, `settings.tsx`
- `App.tsx` — wouter routing with AuthGuard component; root `/` shows landing if unauthed, dashboard if authed
- `AppSidebar.tsx` — full nav with user profile footer + logout

## How to apply
- Set `JWT_SECRET` env var in production
- Set `OPENROUTER_API_KEY` for AI chat to work
- New DB tables pushed with `drizzle-kit push --force`
