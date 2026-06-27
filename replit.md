# AIVerse 2.0

A full-stack AI agent swarm orchestration platform — launch multi-agent task forces, watch them reason and execute in real time, and review structured outputs through a split-pane IDE-style workspace.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (port 21752, path `/`)
- API: Express 5 (path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- UI: Monaco editor, custom ANSI terminal, recharts
- Design: Neural Dark theme (void/plasma/synapse/signal/ember palette)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/db/src/schema/swarm.ts` — DB schema (swarm_sessions, swarm_agents, swarm_events)
- `artifacts/aiverse/src/index.css` — Neural Dark CSS variables
- `artifacts/aiverse/src/pages/` — dashboard.tsx, session.tsx
- `artifacts/aiverse/src/components/swarm/` — SwarmLauncher, AgentCard, EventFeed, SwarmCodeEditor, SwarmTerminal
- `artifacts/api-server/src/routes/swarm/` — REST endpoints
- `artifacts/api-server/src/lib/swarm-engine.ts` — simulation engine (replaces real LLM calls)

## Architecture decisions

- **Simulation engine**: Real LLM calls replaced with a time-stepped simulator that writes events to the DB, so the UI streaming/polling works identically to production.
- **SSE via polling**: Session view polls `GET /swarm/sessions/:id` every 1s while active instead of SSE, keeping the architecture stateless and compatible with the Replit proxy.
- **OpenAPI-first**: All endpoints defined in `openapi.yaml` → Orval generates typed React Query hooks + Zod validators. Never write raw fetch calls.
- **Decimal cost fields**: Drizzle uses `decimal` for cost/budget to avoid float precision issues; serialized as `parseFloat()` in routes.
- **Neural Dark theme only**: App starts in dark mode; no light mode toggle (the design system is dark-only).

## Product

- **Dashboard** — stats cards, 7-day activity chart, session list with status badges
- **Swarm Launcher** — modal with title, objective, model selection, parallelism controls
- **Session View** — live agent cards panel + tabbed Narration/Code/Terminal workspace
- **Narration Feed** — real-time color-coded event stream showing every agent action
- **Code Panel** — Monaco editor showing structured swarm output (plan, agent outputs, result)
- **Terminal Panel** — ANSI-styled terminal log with ASCII art header and color-coded events

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT change `info.title` in `openapi.yaml` (controls generated filenames — must stay "Api")
- After any schema change: run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- After any `openapi.yaml` change: run `pnpm --filter @workspace/api-spec run codegen`
- Query param schemas with same name across endpoints cause TS2308 collision in `api-zod` — use unique `operationId` values or remove shared query params

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
