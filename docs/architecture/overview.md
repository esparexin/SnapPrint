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

## Phase 4 — External Services, Persistence, and Environment Boundaries

### 1. Data Persistence Boundaries (MongoDB Atlas)

- **Database Engine**: MongoDB Atlas managed document database, accessed via official `mongodb` driver (see `docs/decisions/0001-database-persistence-mongodb-atlas.md` and `docs/decisions/0002-data-access-repository-boundaries.md`).
- **Core Collections & Indexes**:
  - `studios`: Indexed by `id` (unique) and `slug` (unique).
  - `user_memberships`: Compound unique index on `{ userId: 1, studioId: 1 }`.
  - `qr_sessions`: Indexed by `sessionId` (unique) and `studioId`. Automated TTL index on `expiresAt` (`expireAfterSeconds: 0`) purges expired sessions.
  - `photo_assets`: Indexed by `assetId` (unique) and `{ studioId: 1, sessionId: 1 }`.
- **Health & Readiness**: `/ready` route performs an active database ping before reporting readiness.

### 2. External Services and Environment Boundaries (ADR 0003)

- **Authoritative Inventory**: All external cloud services, accounts, and integration boundaries are cataloged in `docs/decisions/0003-external-services-and-environment-inventory.md`.
- **MVP-Approved Services**:
  - **Database**: MongoDB Atlas (managed document storage with mock DB test fallback).
  - **Private Object Storage**: AWS S3 / S3-compatible private buckets with pre-signed URLs and local disk fallback.
  - **Payment Gateway**: Razorpay (Indian UPI/cards test sandbox and production mode with webhook validation).
  - **Transactional Email**: ZeptoMail by Zoho (dedicated transactional sending for Owner OTP).
  - **Hosting & Compute**: Next.js App Router on Vercel/Node container; Fastify API on Node.js container.
- **Environment Isolation**: Four strict tiers: `development` (local/mock/offline), `test` (CI runner/hermetic/zero-network), `staging` (pre-production pilot sandbox), and `production` (hardened cloud, HTTPS-mandated `COOKIE_SECURE=true`, verified SPF/DKIM domains).
- **Prohibited Integrations**: Third-party error-monitoring SDKs (Sentry, Datadog) are strictly prohibited; first-party structured logging (`pino`) and RFC 7807 problem details are enforced.
- **Deferred Integrations**: WhatsApp Business API, SMS OTP, recurring subscription billing, and Windows Print Agent code-signing are explicitly deferred until post-MVP gates.

## Phase 5 — Code Sharing, SSOT, and Compatibility Principles

### 1. Shared Contracts vs. Internal Schemas

- **Shared Contracts (`@snapprint/contracts`)**:
  - Acts as the Single Source of Truth (SSOT) across frontend (`apps/web`) and backend (`apps/api`).
  - Contains shared DTOs, API request/response payloads, public domain enums, and cross-boundary entity identifiers and standard field validators (e.g., `StudioIdSchema`, `StudioSlugSchema`, `StudioNameSchema`).
  - TypeScript types are strictly inferred from Zod schemas (`z.infer<...>`).
- **Internal Schemas (Repositories & Route Adapters)**:
  - Database document persistence models (e.g., `StudioDocument`, `UserDocument` in `apps/api/src/repositories/*`), driver-specific MongoDB projection types, and route-local intermediate parsers belong internally to `apps/api`.
  - Do not move internal database mapping or transport-private details into `@snapprint/contracts` unless they represent a shared contract with external clients or web UI.

### 2. Production Fallback and Error Handling Policy

- **No Fake Success in Production**:
  - Production code paths must never mask fatal dependency failures (e.g., payment gateways, storage drivers, database connections) with dummy successful responses.
  - Failures must bubble up as structured RFC 7807 problem details or standard `ApiResponse` errors.
- **Strict Test Isolation**:
  - In-memory mock databases (`mock-db.ts`), test fixtures, and mock service adapters are strictly test-only and isolated from production entry points.

### 3. Compatibility Layers and Deprecation Checklist

- **Retain Necessary Compatibility**:
  - Working backward-compatibility code must not be prematurely deleted in pursuit of "zero legacy code".
  - Existing client versions or active sessions must be supported across deployment rollouts.
- **Checklist Prior to Removing Compatibility Code**:
  1. **Client Reachability**: Confirm no active client version, QR session, or webhook sender relies on the legacy schema or endpoint.
  2. **Traffic Audit**: Verify telemetry and server access logs show zero traffic to the deprecated interface across a complete business cycle.
  3. **Data Backfills**: Confirm all historical documents in persistence stores have been migrated to the modern schema structure.

## Phase 6 — Shop Profile Lifecycle, Direct-Print Thresholds, and Payment Method Gating

### 1. Shop Profile & Activation Lifecycle (ADR 0004)

- **Shop State Machine**: Valid statuses are `onboarding`, `active`, `suspended`, and `closed`.
- **Guided Setup**: A 4-step wizard in the operator portal guides newly created shops through:
  1. _Shop Details_: Name, phone, city, address, operating hours.
  2. _Capabilities & Thresholds_: Direct printing toggle, supported paper sizes (`A4`, `A3`, `A5`, `legal`, `letter`), color/duplex support, and direct-print page limit (`autoPrintMaxPages`).
  3. _Payment Configuration_: Default Pay-at-Counter mode and optional Razorpay API credential verification.
  4. _Review & Activation_: Atomic validation and transition from `onboarding` to `active` via `POST /studios/:studioId/activate`.

### 2. Direct-Print Safety Thresholds (`autoPrintMaxPages`)

- Direct-to-printer flows enforce an `autoPrintMaxPages` limit (options: `20`, `30`, `50`, `100`; default: `30`).
- Prevents printer paper tray exhaustion, head jams, and queue monopolization by rogue print jobs. Jobs exceeding the threshold require manual operator release.

### 3. Payment Method Gating & Cryptographic Verification

- **Default Configuration**: All shops initialize strictly in **Pay at Counter (Cash Only)** mode (`enableCounterPayment: true`, `enableOnlinePayment: false`, `isRazorpayConfirmed: false`).
- **Gateway Handshake Gate**: Online payment via Razorpay can only be activated when `isRazorpayConfirmed: true`. Confirmation requires an active server-side handshake against Razorpay (`POST /studios/:studioId/verify-razorpay`). Invalid or unverified keys cannot enable online checkout.

### 4. Dynamic Customer Checkout Resolution

- Public API endpoint `GET /public/studios/:slug` exposes sanitized `PublicPaymentSettings` without leaking credentials.
- Customer ordering flows evaluate payment options via `resolveCustomerPaymentMethods`:
  - When Razorpay is verified and enabled, customers are offered a dual choice: "Pay Online" or "Pay at Counter".
  - When Razorpay is unconfirmed or disabled, checkout seamlessly falls back to Cash Only with counter instructions.
