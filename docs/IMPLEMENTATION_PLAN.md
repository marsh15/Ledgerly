# 06 — Implementation Plan: Ledgerly

## Status Convention

- **Complete**: implemented in the repository and covered by proportionate verification.
- **Verify**: implemented, but must be rechecked for the target environment before release.
- **Planned**: intentionally deferred or not yet demonstrated.

## Phase 1 — Workspace and Contracts

**Status:** Complete

**Goal:** Establish a typed monorepo with shared transaction contracts.

Tasks:

- Configure npm workspaces for frontend, backend, and shared packages.
- Add TypeScript, Jest, Playwright, lint/build scripts, and environment templates.
- Define Zod contracts for parsing, transaction drafts, filters, and rules.
- Implement the deterministic text parser with edge-case fixtures.

Done criteria:

- Workspaces install and typecheck together.
- Parser samples and validation contract tests pass.
- No runtime package depends on source files through undeclared paths.

## Phase 2 — Database and Tenant Boundary

**Status:** Complete; Verify in each deployment

**Goal:** Persist finance data with defense-in-depth tenant isolation.

Tasks:

- Define Better Auth and application models in Prisma.
- Use decimal money fields, explicit currency codes, ownership keys, and pagination indexes.
- Configure owner/migrator and non-owner runtime database roles.
- Apply PostgreSQL row-level security policies and request-local tenant context.
- Seed demo data only for explicit demo identities.

Done criteria:

- Migrations apply using the migrator connection.
- Runtime queries use the non-owner connection.
- Cross-tenant reads and writes fail in API and database-level tests.
- New non-demo users start empty.

## Phase 3 — Authentication and Session Bridge

**Status:** Complete

**Goal:** Provide registration, login, logout, protected routes, and personal tenants.

Tasks:

- Configure Better Auth email/password, bearer/JWT, organization, and team plugins.
- Create or recover a personal tenant during registration/login.
- Bridge the backend-issued token through Auth.js on the frontend.
- Protect application routes and attach verified scope to protected API routes.
- Apply bounded, process-local rate limits to sensitive endpoints.

Done criteria:

- Users can register, log in, refresh, and log out.
- Expired or missing sessions cannot load protected data.
- Ownership fields sent by a client do not alter server scope.

## Phase 4 — Transaction Capture and Review

**Status:** Complete

**Goal:** Turn raw text into safe, editable, persisted transaction records.

Tasks:

- Implement preview-without-save for one or more raw snippets.
- Surface missing/malformed fields instead of inventing defaults.
- Apply built-in and tenant category rules.
- Detect tenant-local duplicates.
- Save reviewed drafts in bounded batches and expose single-step extraction.
- Add list, delete, filter, opaque cursor pagination, and CSV export.

Done criteria:

- All required parser examples match expected values and confidence.
- Invalid drafts cannot be saved until corrected.
- Transaction create/read/delete, export, pagination, and duplicate links remain tenant-scoped.

## Phase 5 — Category Rules

**Status:** Complete

**Goal:** Support tenant-specific category automation.

Tasks:

- Add category-rule create, edit, delete, and matching behavior.

Done criteria:

- Rules affect future previews without silently rewriting history.

## Phase 6 — Analytics, Subscriptions, and Insights

**Status:** Complete; AI availability is environment-dependent

**Goal:** Convert the ledger into useful, privacy-preserving summaries.

Tasks:

- Compute currency-separated totals, monthly series, categories, merchants, review counts, and duplicates.
- Detect recurring debit candidates without persisting a subscription model.
- Add aggregate-only OpenAI insight cards behind configuration and rate limits.
- Handle empty, insufficient-data, disabled, missing-key, provider-error, and ready states.

Done criteria:

- Analytics respond correctly to the same tenant filters as the transaction list.
- Currencies are never combined into a misleading total.
- Provider payload tests prove raw text and identity are excluded.
- The UI remains useful when AI is unavailable.

## Phase 7 — Production UI and Accessibility

**Status:** Complete; Verify

**Goal:** Deliver a responsive, understandable finance workspace.

Tasks:

- Implement landing, auth, overview, transaction, import, and rules routes.
- Add consistent shell navigation, empty/loading/error states, and confirmations.
- Support mobile layouts without removing core actions.
- Verify keyboard access, focus visibility, field errors, status announcements, contrast, and reduced motion.

Done criteria:

- Core workflows complete at desktop and mobile widths.
- There are no keyboard traps or inaccessible unlabeled controls.
- Empty and failure states always offer an appropriate next action.
- Financial status never depends on color alone.

## Phase 8 — Verification and Release

**Status:** Verify per release

**Goal:** Prove the repository and deployed system satisfy the product contract.

Tasks:

- Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`.
- Verify database migrations and RLS using production-equivalent roles.
- Confirm production secrets and URLs without printing secret values.
- Exercise `/health` and `/ready` plus registration, login, import, transaction, isolation, analytics, and logout flows.
- Confirm a shared rate-limit store and trusted proxy behavior before horizontal API scaling.
- Confirm logs and OpenAI payloads exclude sensitive raw data.

Done criteria:

- All automated checks pass from a clean checkout.
- Fresh production registration creates an empty, isolated workspace.
- Two-user smoke testing shows no cross-tenant data exposure.
- Liveness/readiness checks pass and failure modes are observable.
- README deployment and demo instructions match the deployed environment.

## Deferred Scope

The following require a new product decision and separate implementation plan: direct CSV import with import batches/rollback, saved-transaction editing, bank linking, OCR/PDF statements, native mobile clients, budgets, payments, complex RBAC, persisted subscription entities, and LLM-based extraction.
