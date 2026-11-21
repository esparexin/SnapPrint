# SnapPrint architecture — Phase 1 foundation

## Layout

- `apps/web` — Next.js App Router frontend. Hosts the customer mobile-first UI and, later, the shop owner and platform admin dashboards.
- `apps/api` — Fastify backend. Separate application; owns business logic exposure, validation, and request handling.
- `packages/contracts` — Shared Zod schemas, runtime validation, and API response contracts. Imported by package name (`@snapprint/contracts`).
- `packages/domain` — Pure business logic. No frontend or HTTP framework dependencies. Imported by package name (`@snapprint/domain`).

## Principles

- pnpm workspace monorepo; packages import each other by package name, not deep file paths.
- TypeScript strict mode across all workspaces.
- No speculative business functionality in Phase 1.
- No external services (MongoDB, object storage, Razorpay, email) in Phase 1.
- Maximum source-file size: 250 lines.

## How it runs

- `apps/web`: `next dev` (port 3000)
- `apps/api`: `tsx src/index.ts` (port 3001); exposes `/health` and `/ready`
