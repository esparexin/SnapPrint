# ADR 0002 — Data Access and Repository Boundaries

## Status

Accepted

## Context

SnapPrint requires an organized, maintainable data-access architecture that strictly preserves tenant isolation across all database operations. Without defined persistence boundaries, database queries risk leaking across route handlers, mixing business logic with storage drivers, and omitting mandatory tenant scoping (`studioId`).

Per GitHub Issues #8 (Platform Technology Baseline) and #10 (Core Data Model and Persistence Boundaries), we must establish clean architecture boundaries between HTTP handling, domain validation, and data persistence.

## Options Considered

### Option 1: Direct Driver Calls Inside Fastify Route Handlers — Rejected

- **Description**: Querying MongoDB collections directly inside route handlers (`getDb().collection('orders').findOne(...)`).
- **Drawbacks**:
  - High risk of accidental cross-tenant queries if a developer omits `{ studioId }`.
  - Duplication of query filters and projection logic across multiple endpoints.
  - Tightly couples HTTP route handlers to database driver implementation, complicating unit testing and mocking.

### Option 2: Heavy ORM/ODM (Mongoose or Prisma) — Rejected

- **Description**: Introducing Mongoose schemas or Prisma Client with MongoDB provider.
- **Drawbacks**:
  - Creates duplicate schema definitions alongside monorepo `@snapprint/contracts` (Zod).
  - Heavy runtime footprint, complex prototype chains, and potential performance overhead.
  - Prisma's MongoDB connector lacks mature support for specialized document patterns (TTL indexes, custom pipeline stages) and requires an additional engine layer.

### Option 3: Thin Repository Pattern with Native Driver & Zod SSOT — Selected

- **Description**: Dedicated repository modules in `apps/api/src/repositories/` that encapsulate collection access. Every repository method that touches tenant-scoped data mandates `studioId` as a required parameter.
- **Benefits**:
  - Enforces tenant isolation at compile-time by making `studioId` non-optional in query signatures.
  - Encapsulates database queries, projections, and indexing nuances in dedicated modules.
  - Uses `@snapprint/contracts` Zod schemas as the single source of truth for runtime validation and TypeScript types.
  - Keeps `@snapprint/domain` completely free of persistence and driver dependencies.

## Decision

We adopt a **Thin Repository Pattern** in `apps/api/src/repositories/` backed directly by the official `mongodb` native driver and validated by `@snapprint/contracts`.

## Technical Rationale

1. **Mandatory Tenant Scoping**: Repository methods mandate `studioId` in their signatures (e.g. `findBySessionId(studioId: string, sessionId: string)`). Query filters always include `{ studioId }`, ensuring no cross-tenant data leaks.
2. **Zero Schema Duplication**: Incoming payloads and outgoing documents are validated using `@snapprint/contracts`. This maintains a single source of truth without Mongoose schema overhead.
3. **Domain Independence**: `@snapprint/domain` contains 100% pure business logic and does not depend on database drivers or connection objects. Repositories handle storage and invoke domain logic for state transitions.
4. **Transaction Boundaries**: Multi-document operations (e.g. creating an order while marking an upload session complete) are executed inside MongoDB client sessions using `withTransaction`.
5. **Connection Pooling**: Managed globally in `apps/api/src/db.ts` with pool boundaries (`minPoolSize: 2`, `maxPoolSize: 20`) and clean shutdown hooks on `SIGINT`/`SIGTERM`.

## Consequences

- **Positive**:
  - Clear separation of concerns between HTTP routing, domain rules, and persistence.
  - Testable data layer: repositories can be tested against in-memory or integration test databases.
  - Compile-time and runtime guarantees that tenant IDs are never omitted from queries.
- **Negative / Mitigations**:
  - Requires writing explicit repository methods rather than relying on automated ORM magic methods. This is an intentional choice for clarity, performance, and security.

## Alternatives Rejected

Mongoose was rejected due to schema duplication with Zod, prototype pollution risks, and unnecessary memory overhead. Direct collection queries in route handlers were rejected due to the unacceptable risk of omitting tenant boundaries.

## Reconsideration Conditions

This pattern may be reconsidered if the application transitions to an automated event-sourcing or CQRS persistence framework in a post-MVP scaling phase.
