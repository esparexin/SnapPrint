## Summary & Purpose

<!-- Describe the problem solved and link the relevant GitHub Issue -->

## Problem Category

- [ ] Bug Fix
- [ ] Engineering Standard / Quality Tooling
- [ ] SSOT / Contract Consistency
- [ ] Documentation / Governance

## Non-Negotiable Checks

- [ ] **Single Category**: This PR covers exactly one problem category (no cross-cutting refactors).
- [ ] **No Business Logic Changes**: Existing state machines and calculations are preserved.
- [ ] **No API Contract Changes**: DTOs, routes, and responses remain backward-compatible.
- [ ] **No UI Redesigns**: Visual styling, typography, and UX layouts are preserved.
- [ ] **Deterministic File Budgets**:
  - Page shells $\le$ 100 lines
  - Custom hooks $\le$ 150 lines
  - UI components $\le$ 150 lines
  - Backend handlers $\le$ 200 lines
  - Monorepo absolute ceiling $\le$ 250 lines
- [ ] **No Prohibited Dependencies**: No third-party error/monitoring SDKs added.
- [ ] **Architecture Isolation**: Domain package has zero framework dependencies.

## Verification & Test Results

- [ ] `pnpm check:file-sizes` passed
- [ ] `pnpm check:architecture` passed
- [ ] `pnpm typecheck` passed
- [ ] `pnpm test` passed
- [ ] `pnpm build` passed
- [ ] `pnpm format` passed
