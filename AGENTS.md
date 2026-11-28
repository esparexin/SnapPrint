# SnapPrint Contributor & Agent Engineering Instructions (SSOT)

This document is the **Single Source of Truth (SSOT)** for all coding agents and contributors working in the SnapPrint repository. All changes must comply with these standards.

---

## 1. Core Architectural Model & Package Boundaries

SnapPrint is an engineering-first monorepo using `pnpm` workspaces:

- `packages/contracts`: SSOT for all DTOs, API payloads, and Zod schemas (`@snapprint/contracts`). TypeScript types are strictly inferred from Zod schemas (`z.infer<...>`).
- `packages/domain`: Pure business rules, calculations, permissions, and lifecycle state machines (`@snapprint/domain`). **Must remain 100% framework-independent** (zero imports from `next`, `fastify`, `react`, or application packages).
- `apps/api`: Fastify HTTP API backend. All direct database queries are encapsulated within `apps/api/src/repositories/`. Every tenant query mandates `studioId`.
- `apps/web`: Next.js 15 App Router frontend. Imports shared packages by name (`@snapprint/contracts`, `@snapprint/domain`), never via deep relative paths (`../../packages/`).
- `apps/print-agent`: Local printer daemon client for physical studio hardware spooling.

---

## 2. User Global Rules (Non-Negotiable)

1. **Small, Reviewable PRs**: One PR = one problem category.
2. **No Cross-Cutting Refactors**: Do not bundle unrelated cleanups into feature or fix tasks.
3. **No Business Logic Changes**: Preserve established state machines and domain calculations unless explicitly mandated by issue requirements.
4. **No API Contract Changes**: Maintain backward compatibility across DTOs and routes.
5. **No UI Redesigns**: Preserve visual branding, layouts, and component aesthetics.
6. **Build Gate**: Every change must cleanly pass `pnpm run build` and `pnpm test`.
7. **Scope Discipline**: If a task would exceed one PR, stop and ask.
8. **No Hardcoding & Boundary Governance**:
   - Tenant fleet limits (e.g. `maxActivePrinters`) and quotas must remain optional/unbounded without hardcoded `.default(...)` in schemas or arbitrary fallbacks in queries.
   - Never hardcode geographic regions (states/cities) or placeholder entity names in schemas, repositories, or forms.
   - All dynamic identifiers (e.g. custom paper sizes `cps_*`, studio IDs `std_*`) rendered in customer or operator UIs must resolve to friendly labels via designated resolver helpers (`resolveFormatLabel`, `formatStudioOptionLabel`).
   - Hardcoded localhost endpoints or developer URLs must never be embedded in production source code.
   - Enforced automatically via `pnpm check:governance` and `pnpm check:architecture`.

---

## 3. Permanent Line-Budget Governance

All source files (`.ts`, `.tsx`, `.js`, `.jsx`) must strictly comply with deterministic line budgets:

| File Category        | Maximum Lines | Classification Criteria                                   |
| :------------------- | :------------ | :-------------------------------------------------------- |
| **Page Shells**      | **100 lines** | Files named `page.tsx` under `apps/web/app/`              |
| **Custom Hooks**     | **150 lines** | Files prefixed with `use-` or named `*-hook.ts`           |
| **UI Components**    | **150 lines** | Interactive React `.tsx` files in `components/` or `app/` |
| **Backend Handlers** | **200 lines** | Route registration files in `apps/api/src/*-routes.ts`    |
| **Any Source File**  | **250 lines** | Absolute hard ceiling for any source file in monorepo     |

- **Zero-Baseline Ratchet Rule**: Legacy files exceeding granular sub-budgets are locked in `.line-budget-baseline.json`. New files must meet category budgets. Modified baseline files can only decrease in lines (ratchet down).

---

## 4. UI/UX & Responsive Standards (Mobile-First)

- **Mobile Viewport Zoom Prevention**: All text inputs, textareas, and select elements on mobile must have a minimum font size of `16px` (`text-base md:text-sm`) to prevent iOS Safari auto-zooming.
- **Dialog & Modal Standards**:
  - Present as responsive bottom sheets on mobile devices (`max-md:items-end`) and centered modals on desktop.
  - Mandate background body scroll locking (`useDialog` hook) while any modal is open.
  - Safe-area aware (`pb-safe`) and full touch-target height (minimum 44px for buttons).
- **No Overflow**: Guarantee zero horizontal layout overflow on mobile screens (320px–430px).

---

## 5. Prohibited Integrations & Observability Policy (ADR 0003)

- **Strictly Prohibited**: Third-party error-monitoring SaaS SDKs (Sentry, Datadog, Bugsnag, New Relic, etc.) are barred from client and server bundles.
- **Mandatory Observability**:
  - Fastify native structured logging (`pino`).
  - Standard RFC 7807 problem details for API error responses.
  - First-party health and readiness endpoints (`/health`, `/ready`).

---

## 6. Performance Engineering Standard (Issue #25)

- Reuse single pooled MongoDB client connection (`apps/api/src/db.ts`). Do not connect per request.
- Use explicit field projections (e.g. `{ _id: 0 }`) on all collection reads.
- Password hashing must use native Node.js `scrypt` locally without third-party auth network hops.
- Cryptographic verification (Razorpay, OTP verifiers) must use constant-time `crypto.timingSafeEqual`.
- Keep Next.js client bundles lean (< 110 kB shared initial JS).

---

## 7. Quality Gates & Validation Checklist

Before committing, run:

```bash
pnpm check:file-sizes       # Enforces file-type budgets & ratchet
pnpm check:architecture     # Enforces domain isolation & bans prohibited SDKs
pnpm check:governance       # Enforces zero-hardcoding & architecture boundary rules
pnpm typecheck              # Strict TypeScript checks across all workspaces
pnpm test                   # Full Vitest suite
pnpm build                  # Production builds for all apps and packages
pnpm lint                   # ESLint check
pnpm format                 # Prettier code formatting
```
