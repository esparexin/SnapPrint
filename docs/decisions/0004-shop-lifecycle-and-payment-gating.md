# ADR 0004 — Shop Profile Lifecycle, Direct-Print Thresholds, and Payment Method Gating

## Status

Accepted

## Context

SnapPrint operates in real-world retail print environments across India. Physical print shops face unique operational constraints:

1. **Onboarding and Cash-First Dynamics**: Many local print shop owners operate strictly in cash or are hesitant to connect complex digital payment gateways during initial setup. Forcing immediate payment gateway configuration creates severe onboarding friction and abandons operator adoption.
2. **Direct Print Resource Exhaustion & Spam Prevention**: Direct-to-printer flows (where customers send documents directly to connected print queues) present a critical operational risk. If a rogue or unverified customer orders hundreds of pages, shop printers run out of paper, paper jams lock up devices, and queue starvation blocks other in-store patrons.
3. **Broken Checkout Risk from Invalid Credentials**: Enabling online payment without validating merchant credentials causes customer checkouts to crash or fail midway through print orders, damaging customer and shop trust.

Per GitHub Issue #28 ("Shop Profile, Activation Lifecycle, and Guided Setup"), we establish explicit domain rules, state machine transitions, safety thresholds, and payment gating logic.

## Options Considered

### Option 1: Unrestricted Online Payments & Implicit Activation — Rejected

- **Description**: Allow shops to enter arbitrary payment credentials and mark shops active immediately upon database creation.
- **Drawbacks**:
  - Unverified Razorpay key pairs cause runtime failures during customer payment modal initiation.
  - No shop readiness checks (e.g. missing supported paper sizes or operational hours).
  - High risk of printer queue exhaustion from unbounded direct printing.

### Option 2: Mandatory Gateway KYC Gate Before Shop Creation — Rejected

- **Description**: Prohibit shop creation and activation until an external merchant payment gateway account is approved and verified.
- **Drawbacks**:
  - High onboarding abandonment. Shop owners cannot test printing, QR scanning, or staff management without bank verification.
  - Disregards the reality of Indian cash-at-counter retail workflows.

### Option 3: Guided 4-Step Onboarding with Cash-First Default, Direct-Print Page Thresholds, and Cryptographic Gateway Verification — Selected

- **Description**:
  - Introduce an explicit `onboarding` shop status with a 4-step wizard (Basic Details, Capabilities & Thresholds, Payment Configuration, Review & Activation).
  - Default payment mode strictly to **Pay at Counter (Cash Only)**.
  - Require cryptographic handshake verification with Razorpay API before `enableOnlinePayment` can be activated.
  - Introduce `autoPrintMaxPages` threshold (options: 20, 30, 50, 100 pages; default: 30) to govern direct-print orders.
  - Provide customers with dual choice ("Pay Online" or "Pay at Counter") only when Razorpay is confirmed, defaulting to cash instructions otherwise.
- **Benefits**:
  - Zero onboarding blockers: shops can start fulfilling counter-cash print jobs immediately upon activation.
  - Guarantees payment reliability: online payments cannot be exposed to customers with unverified gateway credentials.
  - Protects printer hardware and consumables from rogue queue spam.

## Decision

We adopt **Option 3** across contracts, domain logic, backend APIs, and the web UI.

### 1. Shop Lifecycle State Machine

- **Statuses**: `onboarding` | `active` | `suspended` | `closed`.
- **Transitions**:
  - A newly registered studio begins in `onboarding`.
  - Transition from `onboarding` to `active` requires explicit validation:
    - Shop name, owner phone, and address must be non-empty.
    - Supported paper sizes must not be empty.
    - `autoPrintMaxPages` must be a valid positive threshold.
    - Operator must explicitly pass `confirmReady: true`.
  - `active` studios can be `suspended` or `closed` by platform administrators or studio owners.
  - `transitionShopStatus` pure domain function enforces valid lifecycle transitions.

### 2. Direct-Print Page Threshold (`autoPrintMaxPages`)

- To prevent printer queue hogging and paper tray depletion:
  - Allowed thresholds: `20`, `30`, `50`, `100` pages (default: `30` pages).
  - Enforced in `ShopCapabilitiesSchema` (`packages/contracts/src/tenant.ts`).
  - Print jobs exceeding this threshold cannot execute direct-to-printer auto-print and must require manual operator review and release.

### 3. Payment Method Gating and Cryptographic Verification

- **Default Configuration**:
  - `enableCounterPayment: true`
  - `enableOnlinePayment: false`
  - `isRazorpayConfirmed: false`
- **Verification Rule**:
  - Online payments (`enableOnlinePayment: true`) cannot be enabled unless `isRazorpayConfirmed: true`.
  - Confirmation is achieved via `POST /studios/:studioId/verify-razorpay` where the backend performs an active API handshake against Razorpay (`https://api.razorpay.com/v1/payments`).
  - If keys are rejected or invalid, `isRazorpayConfirmed` remains `false` and online payments remain locked.
  - Non-production/test environments accept mock test credentials (`rzp_test_*` with valid secret length) to facilitate hermetic CI/CD testing.

### 4. Dynamic Customer Checkout Resolution

- Public studio endpoint (`GET /public/studios/:slug`) exposes sanitized `PublicPaymentSettings` (credentials stripped).
- Customer checkout evaluates available methods using `resolveCustomerPaymentMethods`:
  - If `isRazorpayConfirmed && enableOnlinePayment`: Customer is offered a dual-choice toggle between "Pay Online (UPI / Cards / NetBanking)" and "Pay at Counter (Cash)".
  - If online payment is unconfirmed or disabled: Customer UI defaults cleanly to "Pay at Counter", displaying cash collection instructions and skipping payment gateway popups.

## Consequences

- **Positive**:
  - Frictionless shop onboarding: owners can start operating within minutes without merchant gateway bureaucracy.
  - Zero payment crashes for end customers: gateway modals only appear when credentials are verified.
  - Protection against paper tray exhaustion on high-volume print runs.
  - Strict compile-time and runtime type safety using `@snapprint/contracts` and `@snapprint/domain`.
- **Negative / Mitigations**:
  - Shop owners who wish to accept online payments must obtain Razorpay API keys; guided tooltips and setup links in the operator portal mitigate setup friction.

## Reconsideration Conditions

This decision may be revised if additional payment aggregators (e.g. PhonePe PG, Cashfree, UPI Intent QR) or automated fleet throttling policies are introduced in future releases.
