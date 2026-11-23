# ADR 0003 — External Services, Environments, and Integration Boundaries

## Status

Accepted

## Context

SnapPrint depends on external infrastructure, cloud providers, APIs, and runtime environments to deliver its multi-tenant photo and document printing SaaS platform. Without an authoritative, centralized inventory of external services and environment boundaries:

1. Accounts, credentials, and access keys risk being provisioned ad-hoc or orphaned across fragmented developer accounts.
2. Production secrets risk accidental exposure in version control, insecure transmission, or omission of rotation plans.
3. Unapproved third-party dependencies (such as heavy analytics or third-party error-monitoring SaaS SDKs) may introduce compliance violations, bundle bloat, and user privacy risks.
4. Scope creep may introduce unapproved commercial subscriptions, WhatsApp quotas, or complex native agent integrations before the foundational MVP is validated.
5. Inconsistencies between Development, Test/CI, Staging/Pilot, and Production environments lead to runtime failure and configuration drift.

Per GitHub Issue #23 ([Foundation 25] Inventory and approve external services, accounts, environments, and integration boundaries), this decision record establishes the **single source of truth (SSOT)** for all approved external services, account ownership models, environment separation topologies, secret management hygiene, and integration boundaries.

---

## 1. Authoritative External Service Inventory

The table below catalogs every external service evaluated for SnapPrint, distinguishing approved MVP-required services, explicitly deferred capabilities, and strictly prohibited integrations.

| Service / Provider                     | Purpose                                                            | Canonical Issue | Category / Role           | Decision Status              | Environment Scope                      | Fallback / Exit Strategy                       |
| :------------------------------------- | :----------------------------------------------------------------- | :-------------- | :------------------------ | :--------------------------- | :------------------------------------- | :--------------------------------------------- |
| **GitHub**                             | Source control, issue backlog, PR review, Actions CI/CD            | #1, #5, #6      | Core Infrastructure       | **Approved & Active**        | Dev, CI, Staging, Prod                 | Git mirror, GitLab / self-hosted Gitea         |
| **MongoDB Atlas**                      | Primary multi-tenant document database (ADR 0001, ADR 0002)        | #10             | Data Persistence          | **Approved & Active**        | Dev (Mock/Local), Staging, Prod        | Self-hosted MongoDB Community, DocumentDB      |
| **AWS S3 / S3-Compatible**             | Private storage for customer uploads, previews, print assets       | #13             | Asset Storage             | **Approved (Adapter-ready)** | Dev (Local disk/Memory), Staging, Prod | Cloudflare R2, MinIO, Wasabi                   |
| **Razorpay**                           | Online payment gateway for Indian domestic UPI, cards, net banking | #17, #30        | Payments & Billing        | **Approved & Integrated**    | Dev (Test mode), Staging, Prod         | Cash on Counter, Cashfree, Stripe India        |
| **ZeptoMail (Zoho)**                   | Transactional email provider for passwordless Owner OTP & alerts   | #27             | Communications            | **Approved & Integrated**    | Dev (Mock/Test), Staging, Prod         | AWS SES, Resend, Postmark                      |
| **Next.js Web Hosting**                | App Router frontend hosting (`apps/web`)                           | #1, #16         | Hosting & Compute         | **Approved (Vercel/Node)**   | Dev, Staging, Prod                     | Node.js standalone container, Docker/AWS       |
| **Fastify API Hosting**                | Node.js backend API hosting (`apps/api`)                           | #1, #16         | Hosting & Compute         | **Approved (Node/Docker)**   | Dev, Staging, Prod                     | Render, Fly.io, AWS App Runner, ECS            |
| **Edge DNS & TLS**                     | Custom domain routing, TLS certificate termination, DDoS           | #16             | Edge & Security           | **Approved (Cloudflare)**    | Staging, Prod                          | Provider native DNS (Route 53, Vercel Edge)    |
| **WhatsApp Business API**              | Automated order updates or customer ordering via WhatsApp          | #24 (Phase 6/8) | Communications            | **Deferred (Post-MVP)**      | None                                   | Manual SMS / email notifications               |
| **SMS / Mobile OTP Gateway**           | Customer or owner mobile phone authentication via SMS              | #27             | Identity & Auth           | **Deferred / Not Planned**   | None                                   | Passwordless Email OTP (Authoritative)         |
| **Subscription Billing SaaS**          | Recurring billing, entitlement tiers, SaaS seat management         | #24             | Monetization              | **Deferred (Post-MVP)**      | None                                   | Per-order commission / flat rate               |
| **Windows Print Agent & Code-Signing** | Local background spooler printing agent on Windows PCs             | #18, #19, #26   | Fleet & Printing          | **Deferred (Pilot gate)**    | None                                   | Manual operator browser download               |
| **Third-Party Error SDKs**             | External error reporting SaaS (Sentry, Datadog, Bugsnag)           | #3, #23         | Telemetry & Observability | **PROHIBITED**               | None                                   | First-party structured logging & health routes |

---

## 2. Detailed Provider Decisions and Technical Rationale

### 2.1 Primary Database: MongoDB Atlas (Approved)

- **Rationale**: Document data model matches deeply nested, studio-specific print catalogs, custom pricing models, and photo manifests without relational join complexity. Native TTL indexes on `qr_sessions.expiresAt` automatically purge customer sessions. Pre-existing cluster already configured for the project.
- **Alternatives Evaluated**: PostgreSQL was evaluated and rejected per ADR 0001 due to rigid migration friction on dynamic pricing matrices and reliance on external cron workers for session cleanup.
- **Data Processed**: Studios, user memberships, customer QR session records, asset metadata, order details, payment reconciliation logs.
- **Account & Ownership**: Managed under the primary organizational account (`esparexin`).

### 2.2 Asset Storage: AWS S3 / Private S3-Compatible Storage (Approved)

- **Rationale**: Customer uploads and generated print manifests require private, access-controlled object storage. Assets must never be publicly readable; access is granted strictly via short-lived pre-signed URLs generated by `apps/api`.
- **Alternatives Evaluated**:
  - _Cloudflare R2_: Viable zero-egress alternative; standard S3 API compatibility makes future migration straightforward without code changes.
  - _Local Disk Storage_: Implemented as `LocalDiskStorageService` for offline local development and test hermeticity.
- **Data Processed**: Raw photo originals, PDF documents, rendered previews, and generated print packages.
- **Data Retention & Lifecycle**: Storage lifecycle rules automatically purge unfulfilled/abandoned upload assets after 48 hours, and fulfilled order print files after 7 days, minimizing storage liability and cost.

### 2.3 Payment Gateway: Razorpay (Approved)

- **Rationale**: De-facto payment provider for Indian domestic payments, providing first-class UPI intent, dynamic QR, debit/credit cards, and net banking support. Built-in test sandbox allows full end-to-end payment verification without financial transactions.
- **Alternatives Evaluated**: Cashfree and Stripe India. Razorpay was selected due to existing platform developer accounts and widespread consumer UPI familiarity in target Indian print studios.
- **Data Processed**: Order amounts (in INR paise), currency, customer contact (email/phone supplied during checkout), gateway payment ID, gateway signature.
- **In-Store Fallback**: Every studio supports an offline "Pay at Counter" manual collection method that bypasses online gateway dependencies.

### 2.4 Transactional Email: ZeptoMail by Zoho (Approved)

- **Rationale**: Dedicated transactional email service with strict separation from marketing traffic, delivering superior inbox placement and high deliverability in India. Pay-per-credit pricing model ($2.50 per 10,000 emails) avoids costly monthly minimums during MVP testing.
- **Alternatives Evaluated**:
  - _Gmail / Google Workspace_: Evaluated and rejected for production per Issue #23. SMTP sending caps, anti-abuse blocks, and lack of domain authentication make personal or workspace Gmail accounts unsuitable for production transactional OTP delivery.
  - _SendGrid / Resend_: Higher cost per volume for early-stage operations in target regions.
- **Data Processed**: Owner email address, single-use 6-digit OTP codes, and system account verification notices.
- **Domain Authentication**: Production usage requires verified DNS TXT records for SPF, DKIM, and DMARC on the sending domain.

### 2.5 Observability: Strict First-Party Structured Logging (Prohibited Third-Party SDKs)

- **Rationale**: Per the core repository engineering standard ([Issue #3](https://github.com/esparexin/SnapPrint/issues/3) and [Issue #23](https://github.com/esparexin/SnapPrint/issues/23)), SnapPrint **strictly prohibits third-party error-monitoring SDKs or SaaS solutions** (e.g. Sentry, Datadog, New Relic, Bugsnag).
  - External SDKs introduce uncontrollable third-party network egress, increase client bundle weights, and risk exfiltrating sensitive customer PII or authentication tokens.
  - SnapPrint enforces first-party structured logging via Fastify's native logger (`pino`), standard RFC 7807 problem details in API responses, Next.js telemetry opt-out, and active HTTP health endpoints (`/health`, `/ready`).

---

## 3. Explicitly Deferred and Unapproved Capabilities

To safeguard MVP delivery, the following capabilities are documented as **unapproved for production implementation** until explicit commercial and technical approvals are recorded:

1. **WhatsApp Business Integration**:
   - _Status_: Deferred.
   - _Prerequisites for Reconsideration_: Approved Meta Business Manager account, verified business display name, explicit customer opt-in agreement, message template approvals, and a documented per-conversation cost model.
2. **Customer SMS / Mobile OTP**:
   - _Status_: Deferred / Not Planned.
   - _Policy_: The customer journey is intentionally account-free, relying on physical QR scans and ephemeral sessions. Mandatory mobile verification or SMS OTP is strictly excluded to minimize customer friction and SMS gateway costs.
3. **Subscription Billing & Entitlement Management**:
   - _Status_: Deferred.
   - _Policy_: No subscription plans, trial tiers, recurring billing, or paywalls may be implemented in customer or shop management UIs for the MVP.
4. **Windows Print Agent & Code-Signing**:
   - _Status_: Deferred.
   - _Policy_: The manual-print MVP workflow (operator downloads approved print package via browser) remains authoritative. Local Windows service installation, driver spooling, and Microsoft Authenticode code-signing certificates remain deferred until the dedicated agent release gate.

---

## 4. Environment Separation Topology

SnapPrint defines four strictly isolated environment tiers:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Development   │       │    Test / CI    │       │ Staging / Pilot │       │   Production    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ • Local machine │       │ • GitHub Runner │       │ • Cloud Preview │       │ • Cloud Host    │
│ • Mock / Local  │       │ • Hermetic test │       │ • Staging DB    │       │ • Atlas Replica │
│ • Local storage │       │ • In-memory DB  │       │ • S3 Staging    │       │ • S3 Dedicated  │
│ • Dev secrets   │       │ • Synthetic key │       │ • RZP Test Mode │       │ • RZP Live Mode │
│ • Mock email    │       │ • No ext calls  │       │ • Real Pilot    │       │ • Verified SPF  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Environment Configurations:

1. **Development (`development`)**:

   - Fast, offline-capable local developer iteration.
   - Database: In-memory `mock-db.ts` or local MongoDB instance (`mongodb://127.0.0.1:27017/snapprint_dev`).
   - Storage: `MemoryStorageService` or `LocalDiskStorageService` (`.storage/private`).
   - Email: In-memory mock or console logger (`EmailServiceMock`).
   - Payment: Razorpay test mode keys (`rzp_test_*`).
   - Secrets: Standard non-production development defaults permitted.

2. **Test / CI (`test`)**:

   - Automated verification in GitHub Actions.
   - Hermetic and reproducible: zero external network dependencies.
   - All tests run against in-memory stores and mock adapters.
   - Strict adherence to file budgets and architecture boundary scripts.

3. **Staging / Pilot (`staging`)**:

   - Mirrors production topology with isolated staging credentials.
   - Connected to dedicated MongoDB Atlas staging database and private staging S3 bucket.
   - Razorpay remains in test sandbox mode.
   - Used for the real-world single-shop physical pilot (Phase 17).

4. **Production (`production`)**:
   - Hardened cloud deployment.
   - Enforces strict startup validation (`apps/api/src/config.ts`):
     - `SESSION_SECRET` must be a high-entropy string (>= 32 chars, non-default).
     - `COOKIE_SECRET` must be a high-entropy string (>= 32 chars, non-default).
     - `MONGODB_URI` is strictly required.
     - `COOKIE_SECURE=true` is enforced; insecure overrides (`false`) trigger fatal startup errors.
     - `NODE_ENV=production` mandatory.
     - Live Razorpay credentials (`rzp_live_*`) with verified webhook secret.
     - ZeptoMail domain authenticated with SPF, DKIM, and DMARC.

---

## 5. Secret Management & Key Rotation Policy

### 5.1 Storage Hygiene

1. **Never Commit Secrets**: All `.env`, `.env.local`, and `.env.production` files are strictly excluded from version control via root `.gitignore`.
2. **Template Maintenance**: Only `.env.example` and `apps/api/.env.example` containing dummy placeholder values are committed.
3. **CI/CD Ingestion**: Deployment pipelines ingest secrets exclusively through encrypted repository secrets (GitHub Secrets) or cloud hosting secret managers.

### 5.2 Secret Inventory & Validation Rules

| Environment Variable      | Required In Prod? | Min Entropy / Format                      | Usage                                                |
| :------------------------ | :---------------: | :---------------------------------------- | :--------------------------------------------------- |
| `MONGODB_URI`             |      **Yes**      | Valid MongoDB connection URI              | Primary database connection string                   |
| `SESSION_SECRET`          |      **Yes**      | >= 32 characters (256-bit random hex)     | HMAC-SHA256 signature for customer QR session tokens |
| `COOKIE_SECRET`           |      **Yes**      | >= 32 characters (256-bit random hex)     | Fastify cookie signing for operator session cookies  |
| `COOKIE_SECURE`           |      **Yes**      | `true`                                    | Restricts cookies to HTTPS transport                 |
| `RAZORPAY_KEY_ID`         |      **Yes**      | `rzp_live_*` (or `rzp_test_*` in staging) | Gateway public API identifier                        |
| `RAZORPAY_KEY_SECRET`     |      **Yes**      | High-entropy gateway secret               | Gateway backend authentication                       |
| `RAZORPAY_WEBHOOK_SECRET` |      **Yes**      | High-entropy webhook secret               | HMAC signature validation for payment webhooks       |
| `ZEPTOMAIL_API_TOKEN`     |      **Yes**      | Zoho Send Mail token string               | Transactional email delivery authorization           |
| `ZEPTOMAIL_FROM_EMAIL`    |      **Yes**      | Valid email with verified domain          | Transactional sender address                         |

### 5.3 Credential Revocation & Rotation Procedure

In the event of suspected credential compromise or routine credential rotation:

1. **Immediate Revocation**: Generate replacement API keys/tokens in the provider dashboard (e.g., Razorpay Dashboard -> API Keys -> Roll Key; ZeptoMail -> Mail Agents -> Tokens -> Regenerate).
2. **Atomic Environment Update**: Update the secret value in the cloud hosting provider's environment settings.
3. **Service Restart**: Trigger a zero-downtime rolling deployment of `apps/api` to load the updated credentials.
4. **Audit Verification**: Inspect server logs to confirm successful initialization and verify health check endpoints (`/ready`).
5. **Session Invalidation**: If `SESSION_SECRET` or `COOKIE_SECRET` is rotated, all active customer and operator sessions will gracefully expire and require re-authentication.

---

## 6. Consequences & Governance

### Positive

- Single canonical source of truth for all external dependencies; prevents forgotten accounts, unexpected bills, and vendor lock-in.
- Clear separation between MVP requirements and deferred features prevents premature complexity.
- Strict rejection of third-party monitoring SDKs maintains clean client bundles and airtight user data privacy.
- Well-defined environment topologies ensure development and testing remain fast, hermetic, and offline-capable.

### Negative / Trade-offs

- Manual operator fulfillment requires physical shop operators to download print packages via the dashboard rather than relying on automated background print spoolers (acceptable for MVP).
- First-party error logging requires internal log review and monitoring rather than relying on hosted APM dashboards.

### Reconsideration Conditions

This inventory and policy may be updated only when:

1. The Windows Print Agent passes its formal security review and pilot release gate (Issues #18, #19, #26).
2. A formal product decision approves multi-channel messaging (WhatsApp) with verified business accounts and cost models.
