# ADR 0001 — Database Selection and Persistence Architecture (MongoDB Atlas)

## Status

Accepted

## Context

SnapPrint is a multi-tenant photo printing SaaS platform requiring durable data persistence for:

1. Studios and shop capability configurations (print sizes, media, finishing, pricing models, active printer pairs).
2. Account-free, short-lived customer QR sessions with automatic time-based expiration.
3. Photo assets, upload metadata, and image processing records.
4. Orders, immutable quote snapshots, payment reconciliation records, and print manifests.
5. Print job queues and manual print fulfillment status tracking.

Per GitHub Issues #8 (Platform Technology Baseline), #10 (Core Data Model and Persistence Boundaries), and #23 (External Services and Environments), an evidence-based database engine decision is required before building service and order workflows.

## Decision

We select **MongoDB Atlas** as the managed primary persistence store, accessed via the official `mongodb` native driver in Fastify (`apps/api`).

### Architecture and Data Model Boundaries

1. **Single Source of Truth (SSOT)**: Zod schemas in `@snapprint/contracts` define runtime validation and TypeScript types. Database documents conform to these authoritative contracts.
2. **Tenant Partitioning**: Every tenant-owned document contains an immutable `studioId` field. Compound and unique indexes enforce tenant scoping:
   - `studios`: `{ id: 1 }` (unique), `{ slug: 1 }` (unique).
   - `user_memberships`: `{ userId: 1, studioId: 1 }` (unique).
   - `qr_sessions`: `{ sessionId: 1 }` (unique), `{ studioId: 1 }`, and `{ expiresAt: 1 }` with `expireAfterSeconds: 0` (TTL index).
   - `photo_assets`: `{ assetId: 1 }` (unique), `{ studioId: 1, sessionId: 1 }`.
3. **Automatic Session Cleanup**: MongoDB's native TTL index on `qr_sessions.expiresAt` automatically purges expired customer sessions without requiring external cron sweepers or background daemon processes.
4. **Environment Isolation**: Credentials and cluster URIs are stored in `.env` (strictly excluded from Git) and injected via platform environment variables in production.

## Consequences

- **Positive**:
  - Flexible document model perfectly matches nested print configurations, photo manifests, and custom studio pricing models.
  - Zero ORM impedance mismatch; clean integration with Fastify lifecycle and graceful shutdown.
  - Automated TTL expiration reduces operational complexity.
- **Negative / Mitigations**:
  - Requires strict server-side tenant isolation assertions (`@snapprint/domain`) on every read and write to prevent cross-tenant queries.
  - Database access is restricted to the backend API (`apps/api`); neither frontend apps nor client browsers ever directly contact MongoDB Atlas.
