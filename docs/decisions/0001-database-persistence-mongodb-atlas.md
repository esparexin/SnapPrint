# ADR 0001 — Database Selection and Persistence Architecture (MongoDB Atlas)

## Status

Accepted

## Context

SnapPrint is a multi-tenant photo printing SaaS platform requiring durable, high-integrity data persistence for:

1. Studios and shop capability configurations (print sizes, media, finishing, pricing models, active printer pairs).
2. Account-free, short-lived customer QR sessions with automatic time-based expiration.
3. Photo assets, upload metadata, and image processing records.
4. Orders, immutable quote snapshots, payment reconciliation records, and print manifests.
5. Print job queues and manual print fulfillment status tracking.

Per GitHub Issues #8 (Platform Technology Baseline), #10 (Core Data Model and Persistence Boundaries), and #23 (External Services and Environments), an evidence-based database engine decision is required before building service and order workflows.

## Options Considered

### Option 1: MongoDB Atlas (Managed Document Database) — Selected

- **Strengths**:
  - Flexible document model perfectly maps to deeply nested, studio-specific print catalogs, custom pricing models, and photo manifests without relational join complexity.
  - Native TTL (Time-To-Live) index on `qr_sessions.expiresAt` automatically purges expired customer sessions without external cron sweepers or background daemon workers.
  - Atomic document-level updates (`$set`, `$inc`, `$push`) provide ACID guarantees within single documents (e.g. quote snapshots, order state transitions).
  - Existing MongoDB Atlas cluster is already provisioned and verified for the SnapPrint project (`snapprint-cluster.6ldslpq.mongodb.net`).
  - Native Node.js driver has zero ORM impedance mismatch and full TypeScript/Zod alignment.
- **Weaknesses**:
  - Relational joins across distinct collections require manual aggregation pipelines or multi-document transactions.
  - Requires disciplined application-level tenant isolation enforcement on every query.

### Option 2: PostgreSQL (Relational Database) — Rejected

- **Strengths**:
  - Strict foreign key constraints and schema enforcement at the database engine level.
  - Mature SQL tooling, rich ACID transaction ecosystem across arbitrary tables.
- **Weaknesses**:
  - Rigid tabular structure adds high schema migration friction for rapidly evolving print capabilities, variable finishes, and studio pricing matrices.
  - Session expiration requires custom background cron jobs or external pg_cron extensions.
  - Requires provisioning a new database cluster and abandoning the existing pre-configured MongoDB Atlas environment without a compelling technical necessity.
  - Higher operational overhead and ORM mapping complexity (e.g., Prisma/Drizzle schema synchronization with monorepo Zod contracts).

## Decision

We retain and select **MongoDB Atlas** as SnapPrint's primary persistence store, accessed via the official `mongodb` native driver in Fastify (`apps/api`).

## Technical Rationale

1. **Pre-Existing Infrastructure**: A verified MongoDB Atlas cluster is already active and verified for the project. Retaining it avoids unnecessary infrastructure churn, extra hosting costs, and delays.
2. **Document-to-Domain Fit**: Photo print orders contain nested, immutable snapshots of customer configurations, print dimensions, crop coordinates, and pricing breakdowns that are naturally modeled as structured JSON/BSON documents.
3. **Automated Session Lifecycle**: MongoDB's native TTL indexing (`expireAfterSeconds: 0`) natively enforces the Phase 3 requirement that customer QR sessions auto-expire without dedicated sweeper services.
4. **Single Source of Truth (SSOT)**: Zod schemas in `@snapprint/contracts` serve as the runtime validator and TypeScript source for all database documents, eliminating Mongoose/ORM schema duplication.

## Architecture and Data Model Boundaries

1. **Tenant Partitioning**: Every tenant-owned document contains an immutable `studioId` field. Compound and unique indexes enforce tenant scoping:
   - `studios`: `{ id: 1 }` (unique), `{ slug: 1 }` (unique), `{ status: 1 }`.
   - `user_memberships`: `{ userId: 1, studioId: 1 }` (compound unique), `{ studioId: 1 }`.
   - `qr_sessions`: `{ sessionId: 1 }` (unique), `{ studioId: 1 }`, and TTL index on `{ expiresAt: 1 }`.
   - `photo_assets`: `{ assetId: 1 }` (unique), `{ studioId: 1, sessionId: 1 }`.
2. **Access Isolation**: Direct database access is strictly restricted to `apps/api`. Neither frontend apps (`apps/web`) nor customer client browsers ever directly connect to MongoDB Atlas.

## Consequences

- **Positive**:
  - Zero ORM impedance mismatch; clean Fastify lifecycle integration with graceful connection pool shutdown.
  - Rapid iteration on service configurations without complex SQL schema migration locking.
  - Built-in TTL expiration eliminates background worker maintenance.
- **Negative / Mitigations**:
  - Multi-collection mutations require explicit MongoDB client transactions (`withTransaction`).
  - Developers must use repository helpers that enforce `{ studioId }` scoping on every read and write to prevent cross-tenant leaks.

## Alternatives Rejected

PostgreSQL was rejected because it introduces unnecessary schema migration friction for nested print manifests and catalog options, requires dedicated cron infrastructure for session cleanup, and would discard the existing active MongoDB Atlas project environment.

## Reconsideration Conditions

The database selection may be reconsidered if:

1. SnapPrint introduces complex multi-table accounting reconciliation that exceeds MongoDB multi-document transaction performance.
2. Regulatory compliance in a target deployment market mandates self-hosted relational SQL storage.
