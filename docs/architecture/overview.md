# SnapPrint Architecture Overview

## Monorepo Layout

- `apps/web` — Next.js App Router frontend. Hosts customer mobile QR ordering UI, studio owner management, and platform administration.
- `apps/api` — Fastify backend API. Owns HTTP routes, middleware, validation, business orchestration, and storage adapters.
- `packages/contracts` — Single source of truth for runtime validation schemas (Zod), DTOs, API payloads, enums, and response shapes (`@snapprint/contracts`).
- `packages/domain` — Pure business rules, tenant isolation assertions, permission evaluations, and session lifecycle logic (`@snapprint/domain`). Independent of UI and HTTP frameworks.

## Core Architectural Principles

- **Single Source of Truth (SSOT)**: Shared contracts define schema and types; TypeScript types are inferred from Zod schemas.
- **Tenant Isolation**: Every studio resource (catalog, uploads, orders, print manifests, devices) is partition-keyed by immutable `studioId`. Server-side data access enforces isolation; UI filtering is never a security boundary.
- **Strict Module Boundaries**: Packages are imported by package name (`@snapprint/...`), never via deep relative paths. The domain package has zero dependencies on web/HTTP frameworks.
- **Deterministic File Budget**: Maximum source-file size is 250 lines across all workspaces.

## Phase 3 — Tenancy, Identity, and Security Model

### 1. Multi-Tenant Identity (`studioId`)

- `studioId` is the primary immutable partition identifier for all tenant-scoped data.
- Studio slug (`/s/:slug`) is mutable for branding but does not alter the underlying `studioId`.
- Private object storage keys strictly adhere to tenant prefixes:
  `studios/{studioId}/{scope}/{entityId}/{filename}`

### 2. Identity and Role-Based Access Control (RBAC)

- **`platform_admin`**: Cross-studio administrative access for platform operations and studio lifecycle management.
- **`studio_owner`**: Full administrative ownership of a single studio (catalog, pricing, fleet/printers, settings, staff, orders, asset downloads).
- **`studio_staff`**: Operational fulfillment permissions (order review, marking print statuses, and downloading approved print assets).
- **Customer**: Account-free; interacts solely through time-limited, shop-bound QR sessions.

### 3. Customer QR Session Lifecycle

- Customer mobile flow requires **no mandatory login, password, or OTP**.
- Scanning a studio QR creates/activates a short-lived `CustomerQrSession` (default TTL: 120 minutes) strictly bound to that `studioId`.
- Expired or tampered sessions cannot submit uploads, request quotes, or create orders.

### 4. Upload and Asset Security Policy

- Supported image MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
- Hard per-file limit: 50MB; session limit: 50 assets.
- Asset storage keys are isolated per studio and session. Customer photos are private and access-controlled through short-lived signed URLs.
