# Vessify Project Interview Master Notes

> Repository truth note: the product is named **Ledgerly** in the code, although this handbook is named for the Vessify interview. Every implementation claim below was checked against the repository on 14 July 2026. “Active UI” means code reachable from the current App Router pages; “backend capability” means a working API that may not currently have an active UI.

## 1. What This Project Is

Ledgerly is a personal-finance ledger that turns messy bank text or CSV exports into normalized transactions while treating identity and tenant isolation as backend concerns. A user registers, receives a private personal workspace, adds or imports transactions, reviews anomalies such as duplicates, and sees currency-separated summaries and recurring-charge candidates. The assignment is not merely a parser: its central technical claim is that one authenticated user cannot read, edit, delete, export, aggregate, or reference another user’s finance data.

### The 30-second answer

“I built Ledgerly, a TypeScript personal-finance application for converting bank text and CSV statements into structured, reviewable transactions. It uses Next.js 15 and React on the frontend, Hono and Zod for the API, Better Auth plus an Auth.js session bridge, and Prisma with PostgreSQL. The most important engineering work is defense-in-depth tenant isolation: ownership comes from verified auth context, application queries scope by both user and organization, and PostgreSQL row-level security provides a second boundary.”

### The two-minute answer

“Ledgerly solves the gap between unstructured bank notifications and a usable private ledger. The active UI supports account registration, a protected overview, manual transaction management, paste-text extraction with correction, CSV mapping and rollback, per-currency merchant analytics, and category rules. The backend additionally supports filtered export, recurring-charge detection, append-only audit events, Redis-backed security throttling, and aggregate-only OpenAI insights. I deliberately kept extraction deterministic so it is explainable and unit-testable: regular-expression helpers find candidate fields, return null plus explicit issues for unresolved required values, and calculate a completeness confidence score.

“Architecturally it is an npm-workspaces monorepo with a Next.js app, a Hono API, and a shared package containing Zod contracts, CSV normalization, and parsing. Better Auth owns passwords and backend sessions. Auth.js calls the backend from its credentials provider and stores the Better Auth bearer token in its encrypted session JWT, allowing server pages to redirect unauthenticated users and client queries to call the Hono API. The backend never accepts ownership from request data. It resolves a tenant scope from the verified session, adds it to every Prisma operation, and runs sensitive operations inside a transaction that sets variables consumed by forced PostgreSQL RLS policies. The repository includes tests for parser contracts, analytics, subscription heuristics, route authentication, tampering resistance, and browser-level account switching.”

### The deep technical answer

The browser first reaches a Next.js App Router server page such as **apps/frontend/src/app/transactions/page.tsx**. The page calls the Auth.js auth function and redirects to /login unless the session contains a backend token and user id. Interactive screens are client components. TanStack Query in **apps/frontend/src/features/ledger/queries.ts** calls **apiFetch**, which adds Authorization: Bearer plus the Better Auth session token.

Hono receives the request in **apps/backend/src/index.ts**. The scopedAuth middleware calls **getTenantScope** from **apps/backend/src/tenant.ts**. Better Auth verifies the bearer token, then the code validates active organization and team membership rather than trusting ids in the request. A TenantScope is stored in Hono’s typed context. Route validation uses Zod. Data work passes through **withTenant** in **apps/backend/src/db.ts**, which starts a database transaction and sets app.current_user_id and app.current_organization_id. Queries still include both columns explicitly through helpers such as **buildTransactionWhere**. PostgreSQL RLS in the migrations checks the same pair, so a missing application filter should fail closed when the runtime role is configured correctly.

For text extraction, **packages/shared/src/transaction-extractor.ts** normalizes whitespace, detects fields with deterministic helpers, assigns category precedence (user rule, explicit category, built-in category), and produces a 0–1 confidence score. Preview can split blank-line-separated input into drafts; save validates each draft and derives ownership server-side. CSV import is parsed locally, requires explicit disambiguation for dates such as 06/07/2026, is previewed against tenant-scoped duplicates, and is committed as an ImportBatch plus related transactions. Analytics deliberately groups money by currency instead of adding INR and USD. Subscription candidates are computed rather than persisted. AI receives aggregates and candidates, never raw finance text or identity.

### Product value and relevance to Vessify

The product reduces repetitive data entry while keeping a human review step for uncertain financial data. Its Vessify relevance is strongest in full-stack reasoning: API contracts, authentication versus authorization, relational modeling, tenant-safe queries, sensitive-data handling, testable extraction, and honest production trade-offs. In an interview, emphasize the invariant—“the caller cannot choose ownership”—more than the number of screens.

## 2. Repository Map and File Reading Order

| Order | File/Folder | Layer | Purpose | Concepts Needed | Interview Risk |
| ---: | --- | --- | --- | --- | --- |
| 1 | README.md and docs/PRD.md | Product | Intended behavior, setup, scope | Requirements versus implementation | High: some README claims describe legacy UI |
| 2 | package.json, workspace package files | Build | Workspaces, scripts, dependencies | npm workspaces, scripts | Medium |
| 3 | packages/shared/src/contracts.ts | Contract | Runtime schemas and shared response types | TypeScript, Zod | High |
| 4 | packages/shared/src/transaction-extractor.ts | Domain | Deterministic text extraction | Regex, normalization, confidence | High |
| 5 | packages/shared/src/csv.ts | Domain | CSV parsing, mapping, date normalization | CSV escaping, ambiguity | Medium |
| 6 | apps/backend/prisma/schema.prisma | Data | Auth, tenant, transaction, import, rule models | Relational design, indexes | Very high |
| 7 | prisma/migrations and prisma/rls.sql | Data/security | SQL history and forced RLS | SQL roles, policies, transactions | Very high |
| 8 | apps/backend/src/auth.ts | Identity | Better Auth configuration | Password auth, bearer, JWT, sessions | Very high |
| 9 | apps/backend/src/tenant.ts | Authorization | Verified tenant resolution and provisioning | Membership, race conditions | Very high |
| 10 | apps/backend/src/db.ts | Isolation | Prisma client and tenant transaction | RLS session variables | Very high |
| 11 | apps/backend/src/index.ts | API | Middleware, routes, validation, errors | Hono lifecycle, HTTP | Very high |
| 12 | transaction-query.ts and presenter.ts | API/data | Safe filters and serialization | Prisma inputs, Decimal/Date | High |
| 13 | analytics.ts and subscriptions.ts | Domain | Aggregates and recurring heuristics | Currency, bounded queries | High |
| 14 | openai-insights.ts and rate-limit.ts | Integration | Aggregate-only AI and throttling | Structured outputs, abuse control | Medium |
| 15 | apps/frontend/src/auth.ts | Frontend auth | Auth.js credentials bridge | JWT callbacks, server auth | Very high |
| 16 | app/*/page.tsx and app/layout.tsx | Frontend shell | Routing and protected server pages | RSC, redirect, layout | High |
| 17 | lib/api.ts and features/ledger/queries.ts | Frontend data | Bearer requests, caching, invalidation | Fetch, TanStack Query | High |
| 18 | ledger-app.tsx and ledger-shell.tsx | Frontend composition | Section selection, navigation, logout | Props, client boundaries | Medium |
| 19 | overview-screen.tsx | Frontend | Currency analytics and subscriptions | Queries, charts | Medium |
| 20 | transactions-screen.tsx and transaction-form.tsx | Frontend | Filtered CRUD and concurrency token | Forms, mutations | High |
| 21 | import-screen.tsx and rules-screen.tsx | Frontend | CSV workflow and category rules | Local parsing, mutations | High |
| 22 | audit.ts, security.ts, rate-limit.ts | Security/operations | Safe audit metadata, privacy-preserving logs, Redis throttling | Auditability, hashing, fail-closed dependencies | High |
| 23 | shared and backend tests; e2e/ | Quality | Unit, integration, browser checks | Test pyramid, fixtures | High |
| 24 | docker-compose.yml, .env.example, .github/workflows/ci.yml | Operations | PostgreSQL/Redis services, roles, URLs, CI gates | Secrets, migrations, runtime roles | High |

Study the system from its invariants inward. Read the PRD, then the shared contracts, database model, auth/tenant boundary, and API before opening JSX. This prevents a common mistake: inferring security from a hidden button or protected page. The actual boundary is the verified scope in backend queries and RLS.

After the backend, trace one active flow through **import/page.tsx → LedgerApp → ImportScreen → text preview/correction → useLedgerMutations → apiFetch → Hono route → withTenant → Prisma**. Then trace logout and one audited mutation. The former legacy **dashboard.tsx** was removed in the remediation commit, so current reachability is clearer than before.

## 3. Prerequisites From Zero

### Web applications, frontend, backend, and APIs

A web application is a program split across at least two execution environments: a browser and a server. Ledgerly’s browser-facing portion renders screens and reacts to clicks; its server-side portions authenticate users, apply business rules, and access the database. The **frontend** is the interface users operate. The **backend** is the trusted computing boundary. An **API** is the explicit contract between them: paths, methods, inputs, outputs, and errors.

HTTP is the request/response protocol used by that contract. A request contains a method such as GET or POST, a URL, headers, and sometimes a body. A response contains a status code, headers, and a body. In GET /api/transactions?limit=20, limit is a query parameter. In PATCH /api/transactions/:id, id is a path parameter. Authorization is a header. JSON is the text representation used for most bodies. Cookies are browser-managed name/value records; Auth.js uses a cookie to identify its session, while client API calls explicitly forward the backend bearer token.

HTTP status codes communicate outcome classes: 2xx success, 4xx caller or authentication problems, and 5xx server problems. Ledgerly returns 201 for creation, 400 for invalid requests, 401 for missing/invalid identity, 404 for inaccessible tenant-owned records, 409 for concurrent-edit conflict, 429 for throttling, and 500 for unexpected failures. Returning 404 for another tenant’s id avoids confirming that the object exists.

### TypeScript, Node.js, frameworks, Hono, React, and Next.js

JavaScript is dynamically typed at runtime. TypeScript adds a compile-time type system. It catches mismatched props and response shapes before deployment, but types disappear at runtime; that is why Ledgerly also uses Zod. Node.js is the server runtime executing TypeScript through tsx in development. A framework provides conventions and reusable machinery. Hono supplies routing, middleware, typed context, CORS, and error hooks without the larger surface of Express. This repository uses Hono, not Fastify.

React builds interfaces from components—functions that describe UI from props and state. A server component executes on the Next.js server and can safely read a session before sending HTML. A client component contains the “use client” directive and can use state, effects, event handlers, and browser APIs. Next.js combines React with file-based routing, server rendering, bundling, and deployment conventions. Ledgerly’s protected page files are server components; its data-rich screens are client components.

Server-side rendering means the server produces initial HTML. React Server Components go further: their component code and dependencies need not be shipped to the browser. Hydration is React attaching client behavior to rendered output. Ledgerly uses RSC mainly as a security-aware route gate and prop bridge. It does not use Server Actions; mutations go to the separate Hono API.

### Databases, PostgreSQL, Prisma, schemas, and constraints

A database persists data beyond a process lifetime. PostgreSQL is a relational database: data lives in typed tables connected by keys. A schema describes tables, columns, relations, constraints, and indexes. A primary key uniquely identifies a row; a foreign key requires a referenced row; a unique constraint prevents duplicate key combinations; an index creates a lookup structure that accelerates matching and ordering at a write/storage cost.

An ORM maps program objects to database operations. Prisma generates a typed client from **schema.prisma**. A call such as transaction.findMany becomes parameterized SQL conceptually, reducing injection risk and type mismatches. Prisma does not automatically authorize callers, choose correct tenant filters, guarantee good indexes, or understand financial invariants. Ledgerly supplies those layers explicitly.

### Authentication, authorization, sessions, JWTs, and middleware

Authentication answers “who is this?” Authorization answers “may this identity perform this action on this resource?” Better Auth verifies email/password and maintains backend sessions. A session is server-recognized login state with an expiration. A bearer token is a credential presented in Authorization; possession grants the associated authority, so it must be protected. A JWT is a signed claims container. This project enables Better Auth’s JWT plugin, but protected Hono calls use the opaque Better Auth bearer/session token; the optional backend JWT is stored by Auth.js but not used by apiFetch.

Auth.js also uses a JWT session strategy. That is a separate frontend session envelope stored in an Auth.js cookie. Its payload includes the Better Auth token. “JWT” therefore has two possible meanings here, and a strong interview answer distinguishes them.

Middleware is logic that runs around handlers. Ledgerly uses global CORS and request logging middleware, then route-specific scopedAuth middleware. Middleware is appropriate for cross-cutting identity because it establishes a trusted scope before business handlers execute.

### Multi-tenancy, isolation, validation, errors, and deployment

Multi-tenancy means one running system serves multiple ownership domains. Ledgerly stores tenants in shared tables and tags finance rows with organizationId and userId. Data isolation is the guarantee that one tenant cannot observe or mutate another tenant’s rows. It is stronger than navigation separation: list, detail, mutation, export, analytics, duplicate references, logs, and AI inputs must all respect the boundary.

Validation converts untrusted bytes into accepted domain input. TypeScript cannot validate an HTTP body, so Zod checks length, shape, enums, calendar dates, currency codes, and amount sign. Error handling translates expected failures into stable responses while hiding internal stack traces. Deployment means packaging processes, secrets, database migrations, roles, URLs, networking, health checks, and monitoring in a hosted environment—not merely running npm start.

## 4. Architecture Overview

    Browser
      │  Auth.js cookie / rendered server pages
      ▼
    Next.js 15 frontend
      │  Authorization: Bearer <Better Auth session token>
      ▼
    Hono API ── Better Auth + organization membership
      │                 │
      │ typed TenantScope { userId, organizationId, teamId }
      ▼
    Zod contracts → parser / CSV / analytics / subscription / AI services
      │
      ▼
    withTenant Prisma transaction
      │ sets app.current_user_id + app.current_organization_id
      ▼
    PostgreSQL shared tables + forced RLS

The frontend and backend are separately runnable applications, while the shared package prevents their most important domain shapes from drifting. Authentication is intentionally layered: Better Auth owns identity and database sessions; Auth.js integrates that identity with Next.js server pages. Data operations are synchronous because regex parsing and batches capped at 1,000 rows are small enough for the assignment.

The end-to-end flow is: a user visits a protected page; the server checks Auth.js; registration/login is proxied to Hono and Better Auth; Auth.js stores the returned backend token; a client screen sends a bearer request; Hono validates it and resolves membership; Zod validates user-controlled data; the route derives ownership from context; Prisma runs within an RLS-configured transaction; a presenter converts Decimal and Date values to JSON; TanStack Query renders or invalidates cached views.

This is a sensible internship architecture because boundaries are visible and testable. Alternatives include one Next.js application with route handlers, a server-rendered monolith, Fastify/Express, direct SQL, or a queue-based ingestion service. Redis-backed distributed throttling, append-only audit events, dependency-aware readiness, and CI service containers are now implemented. At production scale, add managed connection pooling, centralized telemetry, audit retention/export policy, background import/extraction jobs, object storage and malware scanning for actual uploads, idempotency keys, stronger money primitives in analytics, and deployment/rollback automation.

## 5. Backend Deep Dive

### Function/Component: app and middleware chain

File: **apps/backend/src/index.ts:40–168**

The exported Hono app registers CORS, request-id and security logging, health/readiness routes, authentication routes, Redis-backed throttling, and scoped middleware. Inputs are HTTP requests; outputs are Responses. CORS only echoes configured origins and permits credentials. General logs omit bodies; auth security events hash email/IP identifiers. scopedAuth verifies a session and stores TenantScope in typed context. Readiness now checks both the database and limiter. Production improvements include a structured logging backend, trace propagation, security headers, and bounded request-body middleware.

### Function/Component: register and login handlers

File: **apps/backend/src/index.ts:82–157, 837–855**

These handlers validate normalized email and password, apply private rate-limit keys, forward a synthetic request to Better Auth, translate upstream errors, require both user and token in successful payloads, provision a personal tenant, and preserve auth response headers. Login enforces email+IP and IP-wide windows, returns Retry-After on 429, and fails closed with 503 if the limiter is unavailable. Ownership is not accepted. A malformed upstream success becomes 502. Interview phrasing: “I wrapped Better Auth rather than reimplementing password security.” Remaining improvements include verified email, password reset/MFA, and less brittle adaptation to upstream response shapes.

### Function/Component: getTenantScope and ensurePersonalTenant

File: **apps/backend/src/tenant.ts:8–119**

getTenantScope calls Better Auth’s getSession with request headers. If an active organization exists, it verifies membership; it separately verifies active team membership. Otherwise it chooses the user’s first membership or provisions a personal organization and team. ensurePersonalTenant uses deterministic ids, a serializable Prisma transaction, unique-conflict retry behavior, and finally updates sessions. Failure cases include database unavailability and a provisioning race that cannot be resolved. The key security property is that session fields are treated as claims to verify, not unquestioned ownership. A production SaaS should support explicit organization switching and avoid updateMany across every session when changing one active context.

### Function/Component: withTenant

File: **apps/backend/src/db.ts:9–14**

withTenant starts a Prisma transaction, sets transaction-local PostgreSQL configuration variables, and passes only that transaction client to the callback. RLS policies read these values. The third set_config argument is true, so values are local to the database transaction rather than leaking through a pooled connection. This helper is the bridge between application identity and database policy. It must never execute tenant queries outside the supplied callback. Improvements: prohibit direct access to the global Prisma client in domain repositories, add RLS integration tests for every protected table, and use a pool compatible with transaction-local settings.

### Function/Component: transaction routes

File: **apps/backend/src/index.ts:170–319, 417–547**

Preview parses raw text and enriches each draft with tenant-scoped duplicate detection without writing. Bulk create validates 1–100 drafts and assigns server-derived user, organization, and team. Single-step extract parses and writes one row. PATCH performs optimistic concurrency: it compares expectedUpdatedAt, validates the merged object, then uses updateMany with the old timestamp to close the check/write race. DELETE first finds a scoped row and returns 404 otherwise. Listing validates filters and an opaque composite cursor, verifies that the cursor row belongs to the tenant, orders by createdAt and id, and fetches limit + 1.

The routes are safe from caller-supplied ownership because the Zod schemas strip unknown keys and route data uses scope. duplicateOfId is re-resolved inside the same tenant. Limit validation has a weakness: it rejects values above 50 but does not require digits or a positive integer, so values such as abc or negative numbers can reach Number and Prisma. Use z.coerce.number().int().min(1).max(50).

### Function/Component: import, rules, analytics, and insights routes

File: **apps/backend/src/index.ts:320–416, 479–527, 549–634**

Import preview checks database and within-file duplicates. Commit creates an ImportBatch then individual transactions inside one database transaction, so failure rolls the whole batch back. Rollback deletes only tenant-owned transactions linked to a tenant-owned batch. Category rule reads and mutations are scoped; POST upserts on organizationId plus matchText. Analytics and subscription routes reuse the same scoped filter builder. Insights compute tenant aggregates first, return explicit empty/config states, and call OpenAI only when enough data exists.

The import loop and duplicate preview issue one or more queries per row, an intentional N+1 trade-off acceptable at small limits but expensive at 1,000 rows. Category-rule uniqueness is organization-wide while RLS also requires userId; this is consistent for one-person organizations but awkward for future shared organizations.

### Supporting backend files

**env.ts** fails fast on required secrets/URLs, rejects localhost origins in production, and requires REDIS_URL in production. **transaction-query.ts** composes filters without weakening scope. **transaction-presenter.ts** converts Prisma Decimal and Date values into JSON-safe numbers and ISO strings. **analytics.ts** reads at most 5,000 rows and returns per-currency totals, category totals, and the top 12 merchant totals using the shared merchant normalizer. **subscriptions.ts** reuses that normalizer, groups by currency and ₹25-style amount bands, then recognizes weekly, monthly, or quarterly gaps. **openai-insights.ts** sends only aggregate JSON and validates structured output. **rate-limit.ts** uses Redis when configured, memory locally otherwise, and a fail-closed placeholder while a required limiter is unavailable. **audit.ts** accepts a discriminated allowlist of safe mutation events.

The central weakness is that **index.ts** is over 900 lines and mixes transport, validation, auth adaptation, CRUD, imports, pagination, and CSV formatting. A mature refactor would split route modules and domain services while preserving the scope-first API.

## 6. Frontend Deep Dive

The App Router maps directories to routes. **app/layout.tsx** is the root server layout that installs Geist fonts, global CSS, TanStack Query’s client provider, and Sonner notifications. **app/page.tsx** redirects to overview. Login/register pages are server-renderable presentation components containing the client **AuthForm**. The four protected pages call auth on the server and redirect before rendering private shells.

**apps/frontend/src/auth.ts** is the session bridge. Its Credentials provider calls Hono registration/login on the server. JWT and session callbacks copy the backend token into Auth.js state. This avoids placing the password-auth request directly in client business code, but it creates two session systems to understand. **app/api/auth/[...nextauth]/route.ts** exposes Auth.js GET/POST handlers; it is not a business API.

**Providers** creates one QueryClient per mounted React tree using lazy state. **LedgerApp** selects a screen. **LedgerShell** is client-side because it controls mobile navigation, query cache clearing, and logout. It first posts the bearer token to /api/auth/logout to revoke the Better Auth session, reports revocation failure, clears user-keyed queries, and always ends the Auth.js session. Server authorization remains necessary even if cache clearing fails.

**queries.ts** centralizes user-keyed query keys and mutations. Successful writes invalidate the entire user ledger prefix, prioritizing correctness over minimal refetches. **apiFetch** attaches the bearer credential and converts non-2xx structured errors to JavaScript Error. It always sets content-type application/json, even for DELETE requests; harmless here but imprecise. It does not automatically react to 401 by signing out.

**OverviewScreen** loads currency-separated summaries, recurring candidates, and top merchants per currency, including separate spend/income values, loading, error, empty, responsive metrics, and an accessible textual chart label. **TransactionsScreen** offers manual CRUD, filters, pagination, desktop table/mobile cards, dialogs, and destructive confirmation. It sends expectedUpdatedAt for conflict detection. Its UI omits dateTo even though the filter type supports it, and it does not expose category, account, confidence, or export filters currently supported by the backend.

**ImportScreen** has CSV and Paste Text tabs. CSV reads locally, enforces extension/size/row limits, maps headers, requires explicit type/currency and ambiguous-date choices, calls duplicate preview, lets users include/exclude rows, commits, and can roll back. Paste Text calls the deterministic preview API, displays field-level issues, leaves duplicates unchecked by default, lets the user repair date/description/amount/type/currency, reuses the save schema for validation, blocks invalid selected drafts, and saves reviewed drafts with NEEDS_REVIEW status. **RulesScreen** creates and deletes phrase/category mappings. Editing rules is supported by the API but not by the active UI.

The shadcn-style primitives under **components/ui** wrap semantic elements with reusable variants. Tailwind provides utility classes, while **globals.css** defines color/font tokens and the shared form-control. Accessibility positives include labels, alert roles, dialog semantics, mobile alternatives, and chart aria text. Gaps include no focus trap/escape behavior in custom dialogs, no automated component accessibility tests, and the mobile overlay is not a fully managed modal.

The remediation removed the unmounted **components/dashboard.tsx** and migrated the important extraction and merchant capabilities into current feature screens. Export, advanced filters, and AI insights still have backend support without active UI controls, so distinguish those backend capabilities from the reachable interface.

## 7. Database and Prisma Deep Dive

Prisma Client is generated from **apps/backend/prisma/schema.prisma**. Prisma parameterizes normal queries and converts relational rows to typed objects, but authorization remains the application’s job.

**User** stores Better Auth identity: required id/name/email, unique email, verification/image, timestamps, and relations. **Session** stores an expiring unique token, device metadata, user foreign key, and optional active organization/team. **Account** stores provider-specific identity and the password hash for credential accounts; code must never expose it. **Verification** supports expiring verification values. **Jwks** stores signing key material for the JWT plugin; privateKey is highly sensitive and deserves encryption/access controls/backups.

**Organization** is the tenant container with unique slug and relations. **Member** connects user and organization with a unique pair and role. **Team/TeamMember** model a subgroup; the current personal tenant creates one team, but finance queries do not filter by team. **Invitation** supports organization invitations but has no active product UI. These Better Auth models make richer organization membership possible, while current finance isolation remains personal-user based.

**Transaction** is the main aggregate. id is a cuid; userId and organizationId are mandatory ownership; teamId is optional metadata. date is a PostgreSQL timestamp normalized to UTC midnight. type is an enum. amount and balanceAfter are Decimal(12,2), which avoids binary floating storage. currencyCode defaults to INR. category, confidence, review status, account label, duplicate self-reference, import batch reference, source enum, raw text, and timestamps support the workflows. Multiple composite indexes serve tenant listing, date filters, status/category/account filters, imports, and duplicate references.

There is no database check constraint enforcing debit-negative/credit-positive, confidence 0–1, or a three-letter currency. Zod enforces these application-side, but direct SQL or future services could violate them. Add CHECK constraints. duplicateOfId can technically reference a row of another tenant at database level; code prevents it, but a composite ownership constraint or trigger would provide stronger integrity.

**ImportBatch** stores metadata and owns imported transactions logically. It records selected/skipped counts but not a checksum or idempotency key. **CategoryRule** maps tenant phrases to categories. Its unique key is organizationId + matchText; match case is not normalized before storage, so “Starbucks” and “starbucks” may coexist even though matching normalizes both. **AuditEvent** records actor, organization, action, resource type/id, request id, safe JSON metadata, and creation time. It intentionally has no cascading foreign keys, preserving history when domain records disappear.

Migrations create auth/tenant/transaction tables, JWKs, management fields and initial RLS, currency, imports and stronger user+organization RLS, then append-only audit events. The audit migration enables and forces RLS, permits only actor+organization insert/select, and installs a trigger rejecting UPDATE or DELETE. **init-runtime-role.sql** grants the runtime role only SELECT and INSERT on audit events and explicitly revokes update/delete/truncate. The runtime role is deliberately not the table owner, because owners can bypass RLS. Local migrations must run with the migrator URL even though Prisma schema reads DATABASE_URL; this is documented as an environment override rather than configured through a shadow/direct URL. Seed uses explicit demo emails only and uses scoped transactions for finance rows.

Connection pooling matters because PrismaClient opens connections and RLS context is transaction-local. In serverless deployment, use a managed pool/Prisma-compatible adapter, reuse clients within an instance, and avoid transaction-pooling modes that break assumptions. The current singleton is suitable for the long-running Hono process.

## 8. Authentication Deep Dive

Registration begins in **AuthForm**. signIn(credentials) calls the Auth.js route. The Credentials authorize callback in **frontend/src/auth.ts** posts to Hono /api/auth/register. Hono validates input, forwards to Better Auth sign-up/email, requires a token, and calls ensurePersonalTenant. Auth.js then stores the Better Auth token inside its own JWT session and sets its cookie. Login is the same minus user creation and is protected by private email+IP and IP-wide rate-limit keys. Logout posts to Hono /api/auth/logout so Better Auth revokes the backend session, then clears user-keyed React Query data and ends Auth.js state even if revocation reports an error.

Protected server pages call auth and redirect if the Auth.js session lacks backendToken. Protected API routes independently call Better Auth getSession on the bearer header. Thus page redirect improves UX, while API verification provides real security. Expiration is seven days in both systems, with Better Auth updating age daily. If either session becomes invalid, backend requests return 401; the frontend currently shows an error rather than centrally signing out and redirecting.

**Why Better Auth?** It avoids custom password hashing/session code, integrates with Prisma, and supplies bearer, JWT, organization, and team plugins. **What is stored?** Auth.js’s encrypted/signed session cookie contains a JWT payload including backendToken; JavaScript receives the token through the session and passes it to client components, which increases XSS impact compared with an HttpOnly backend-only proxy design. **How is the user verified?** Better Auth checks the token and returns a session; tenant.ts then verifies membership. **What is the enabled Better Auth JWT used for?** A jwt value may be returned and stored as backendJwt, but current apiFetch does not use it.

Production improvements are email verification, reset flow, MFA/passkeys, secure-cookie verification, shorter access credentials with rotation, CSP/XSS hardening, centralized abuse telemetry, and possibly a backend-for-frontend proxy so the Better Auth token never enters client component props.

## 9. Authorization and Multi-Tenant Data Isolation

Tenant-per-database offers strong isolation but high operational cost. Tenant-per-schema is somewhat cheaper but still migration-heavy. Shared tables with a tenant id, Ledgerly’s choice, scale economically but demand perfect scoping. Ledgerly uses both organizationId and userId, effectively a personal-user workspace inside an organization model. This is stricter than organization sharing: two members of one organization would still not share finance rows.

The defense has four steps. First, Better Auth verifies identity. Second, tenant.ts verifies membership and constructs scope. Third, every Prisma filter derives both ownership values from scope. Fourth, forced RLS checks transaction-local variables set by withTenant. Frontend page guards and query keys are useful but not security boundaries.

### Data Isolation Audit

| Route/data operation | Rating | Reason |
| --- | --- | --- |
| Transaction preview | Safe | Rules and duplicate lookups run inside tenant context; no write |
| Bulk create / extract | Safe | Ownership is server-derived; unknown caller ids are stripped |
| List and cursor | Safe | Base filter and cursor ownership require both ids |
| PATCH and DELETE | Safe | Scoped lookup; update includes scope and timestamp; inaccessible id becomes 404 |
| Export | Safe | Reuses buildTransactionWhere inside withTenant |
| Import preview/commit/history/rollback | Safe | Every lookup/write derives scope; duplicate references are revalidated |
| Category rule CRUD | Safe for current personal model | Both ids and RLS; org-only uniqueness complicates shared organizations |
| Audit-event writes | Safe and append-only | Typed event allowlist, same mutation transaction, actor+organization RLS, and database trigger blocks mutation |
| Analytics/subscriptions | Safe | Shared scoped filter builder; aggregate input is isolated |
| AI insights | Safe at tenant boundary | Only scoped aggregates leave service; provider privacy/retention still matters |
| Tenant provisioning/auth tables | Partially safe | Uses global Prisma intentionally because RLS covers finance tables only; access must remain internal |
| Seed cleanup/admin scripts | Partially safe | Privileged operational code can bypass normal flows; protect production execution |
| Active frontend cache | UX-safe, not an authority | Keys contain userId and logout clears them, but backend must remain authoritative |

An attempted body userId change has no effect because save schemas do not include ownership and route data explicitly uses scope. An attempted foreign URL id yields no scoped row. An attempted foreign duplicateOfId is replaced with null. These exact behaviors appear in **auth-routes.test.ts**.

RLS is genuinely implemented, not merely optional advice: the migrations enable and force policies on transaction, category_rule, import_batch, and audit_event. Its effectiveness depends on using the non-owner ledgerly_app runtime role. The CI workflow provisions PostgreSQL and that runtime role before integration tests. Further hardening includes tests that deliberately omit Prisma where filters, compound tenant foreign keys, an organization-sharing decision, and a repository interface that never exposes unscoped clients.

## 10. Transaction Extraction Feature Deep Dive

Transaction extraction converts semi-structured text into a repairable draft. **extractTransaction** collapses whitespace, then calls findDate, findAmount, findTransactionType, findBalance, findDescription, findCategory, and resolveCategory. Date recognition supports ISO, named day-month-year, and numeric slash forms and validates the resulting calendar date. Numeric dates are month-first unless the first number exceeds 12. Amount recognition prefers an Amount label, then currency-marked values outside a nearby balance window, then a number followed by Dr/debited. Type comes from sign or explicit debit/credit words. Debit amounts are normalized negative; credits positive only after type is known.

Description parsing prefers a Description label; otherwise it removes detected date/amount, transaction ids, balance tails, arrows, and debit/credit words. Category precedence is tenant rule, explicit parsed category, then built-in merchant mappings. Currency recognizes INR/rupee markers and USD/dollar markers. Required fields that cannot be resolved remain null and produce typed field issues rather than fabricated defaults. Confidence adds 0.25 date, 0.25 amount, 0.20 description, 0.15 type, 0.10 balance, and 0.05 category. Below 0.85 becomes NEEDS_REVIEW.

    raw text
      → whitespace normalization and regex field detection
      → {nullable required fields, balance, category, confidence, issues[]}
      → Zod extractedTransactionSchema
      → optional preview drafts + duplicate checks
      → transactionInputSchema on save
      → server-derived ownership + Prisma create + RLS
      → presentTransaction JSON

Blank lines split bulk input. Duplicate detection compares tenant, date, exact amount, account label, and normalized description similarity. It warns/links but does not enforce uniqueness. There is no idempotency key; repeated extract calls can create duplicates. CSV has a separate local parse/normalize path and backend preview.

Limitations are important: the deterministic parser handles only INR/USD and a limited set of English statement patterns, so users may need to repair fields. Amount sign without an explicit debit/credit signal can remain ambiguous instead of being guessed. Description heuristics can absorb noise. Raw text is stored for saved text-derived transactions, increasing privacy impact. Duplicate detection remains advisory rather than an idempotency guarantee.

The active Paste Text tab implements preview, issue display, duplicate opt-in, correction, validation, and save. It deliberately blocks selected drafts until required issues are repaired and marks saved text drafts NEEDS_REVIEW. In the interview say: “The parser does not invent financially meaningful defaults; it exposes uncertainty for human correction.” Better future designs add locale profiles, idempotency keys and database fingerprints, review/audit history visible to users, and—only where useful—LLM/OCR extraction behind structured validation and human approval. Background jobs are justified for large PDFs/OCR, not these small synchronous text inputs.

## 11. API Design

REST models domain resources through URLs and standard methods. GET should read, POST commonly creates or invokes a non-idempotent action, PATCH partially changes, and DELETE removes. Statelessness means each API request carries enough authentication/context to be handled independently; it does not mean the system stores no sessions. Idempotency means repeating the same operation has the same intended effect. Ledgerly GETs are idempotent, DELETE is effectively idempotent in state but returns 404 on repetition, PATCH with the same concurrency token conflicts after the first change, and creates/extracts are not idempotent.

| Method and path | Auth | Input and response | Data work, errors, and interview note |
| --- | --- | --- | --- |
| GET /health | No | {ok:true} | Process liveness only; does not check dependencies |
| GET /ready | No | 200 ok or 503 dependency unavailable | Checks Redis limiter readiness and executes SELECT 1 |
| POST /api/auth/register | No | name?, email, password → user, token, jwt? | Zod → Better Auth → personal tenant; duplicate/auth/malformed errors |
| POST /api/auth/login | No | email, password → user, token, jwt? | Better Auth sign-in; private Redis limits, Retry-After 429, fail-closed 503 |
| POST /api/auth/logout | Yes | bearer session → {ok:true} | Explicit Better Auth sign-out/revocation plus privacy-safe security event |
| GET/POST /api/auth/* | Depends | Better Auth protocol | Catch-all framework endpoints; avoid documenting as application CRUD |
| POST /api/transactions/preview | Yes | text 8–50,000 chars, accountLabel? → drafts | Parses, applies rules, checks duplicates, no write; 400/401/429 |
| POST /api/transactions | Yes | 1–100 validated drafts → transactions | Atomic tenant-scoped creates; not idempotent |
| POST /api/transactions/extract | Yes | text 8–10,000, label? → transaction + duplicate | Single-step parse/write alternative; active UI uses preview/correct/save |
| GET /api/transactions | Yes | filters, limit, cursor → items + nextCursor | Composite keyset pagination; bad cursor 400 |
| PATCH /api/transactions/:id | Yes | partial fields + expectedUpdatedAt → transaction | Tenant-safe optimistic concurrency; 404 or 409 |
| DELETE /api/transactions/:id | Yes | id → {ok:true} | Scoped hard delete; 404 hides foreign/missing distinction |
| GET /api/transactions/export | Yes | filters → text/csv | Up to 1,000 scoped rows; active UI does not expose it |
| POST /api/imports/preview | Yes | filename + 1–1,000 CSV-normalized records → preview rows | Database and within-file duplicate checks |
| POST /api/imports | Yes | filename + records/include → batch + rows | Atomic batch create; N+1 per-row writes |
| GET /api/imports | Yes | none → last 50 batches | Scoped metadata history |
| DELETE /api/imports/:id | Yes | id → deletion count | Scoped rollback of batch transactions and batch |
| GET /api/analytics/summary | Yes | transaction filters → currencySummaries/counts | Reads max 5,000; includes top 12 normalized merchants per currency |
| GET /api/analytics/subscriptions | Yes | filters → candidates | Computes from max 2,000 debits; no persisted resource |
| POST /api/insights/generate | Yes | optional filters → status + cards | Rate-limited, aggregate-only OpenAI; active UI absent |
| GET/POST /api/category-rules | Yes | list or phrase/category | POST is an upsert, so repeated normalized-identical text is mostly idempotent |
| PATCH/DELETE /api/category-rules/:id | Yes | replacement values or id | Tenant-safe; PATCH exists but active UI only creates/deletes |

The API is resource-oriented overall, but action endpoints preview, extract, export, logout, and generate are pragmatic RPC-style additions. That is acceptable because they represent computations rather than simple row resources. Improvements are OpenAPI documentation, API versioning, shared schemas for query strings instead of duplicated backend schemas, a consistent pagination envelope, idempotency-key support, stricter limit parsing, and an audit read/export policy if administrators need one.

## 12. Request Lifecycle Walkthroughs

### 1–3. Signup, login, and logout

On signup, **AuthForm** collects and normalizes fields, then calls Auth.js signIn with mode register. **frontend/src/auth.ts authorize** calls Hono register. Hono validates, Better Auth hashes/stores the credential and creates a session, **ensurePersonalTenant** creates Organization, Member, Team, TeamMember and updates session context, and the bearer token returns to Auth.js. Auth.js writes its session cookie; the router moves to overview. Login reuses this path with sign-in and ensures legacy users have a tenant. Failures include invalid form data, unreachable backend, duplicate email, malformed auth response, or database provisioning error.

Logout starts in **LedgerShell.logout**. It posts the bearer credential to Hono /api/auth/logout; Hono forwards Better Auth sign-out and records a privacy-safe security event. The UI reports revocation failure, removes TanStack Query entries under the user key, and always calls Auth.js signOut with /login. Interview answer: “I terminate both layers of the split session model and still clear local state if the upstream call fails.”

### 4. Open dashboard

The root redirects to /overview. **overview/page.tsx** runs on the server, reads Auth.js, and redirects without a backend token. It passes token/user metadata to **LedgerApp**, then **OverviewScreen** runs client queries. apiFetch adds the bearer token; Hono’s scopedAuth verifies it; analytics and subscriptions use withTenant and RLS. A database outage becomes a structured 500 on these routes rather than the readiness 503 because general Prisma errors fall into onError.

### 5–6. Submit and store extraction input

In ImportScreen’s Paste Text tab, the frontend posts to /api/transactions/preview. Hono resolves scope, loads category rules, creates nullable drafts with explicit issues, checks tenant-scoped duplicates, and returns without writing. Duplicates start unselected. The user edits required fields; the frontend reuses transactionInputSchema and blocks saving selected invalid drafts. POST /api/transactions revalidates and creates NEEDS_REVIEW rows with server ownership. The single-step /extract route remains an API alternative.

### 7. View transactions

**TransactionsScreen** calls **useTransactions**. The query key includes userId and filters. Hono validates filters and cursor, verifies cursor ownership, fetches one extra row, serializes Decimal/Date through **presentTransaction**, and returns an opaque next cursor. TanStack Query appends pages. Failures show ErrorBlock; empty result shows a purpose-built state.

### 8. Edit and delete

The edit drawer initializes **TransactionForm** from a presented row. It converts amount magnitude back to signed amount and sends expectedUpdatedAt. The backend reads a scoped record, checks the version, validates the merged data, and conditionally updates with the same timestamp. This is optimistic concurrency, not an optimistic UI update. Delete shows a confirmation and calls scoped hard delete. Create/update/delete write append-only audit events in the same database transaction; there is still no undo or soft delete.

### 9–10. Unauthorized and cross-tenant attempts

Without a valid bearer token, getTenantScope throws 401 before the route. If User B supplies User A’s id, route filters include B’s verified user and organization, so no row matches and a 404 returns. RLS independently checks transaction variables. If a caller adds userId/organizationId to a create body, Zod’s object behavior strips unknown fields and the route ignores them. The integration test exercises list, delete, export, analytics, subscriptions, insight, and duplicate-reference isolation.

## 13. TypeScript Deep Dive for This Project

Primitive types include string, number, boolean, null, and undefined. Object types describe named fields. Union types such as “DEBIT” | “CREDIT” restrict values. Optional fields use question marks and differ from nullable values: absent means not supplied, while null often means deliberately no value. **TransactionFilters** uses optional properties; **balanceAfter** uses number | null.

Type aliases in **contracts.ts** define PresentedTransaction, AnalyticsResponse, and import shapes. Zod’s infer connects runtime parsing to compile-time types. Prisma-generated Transaction and TransactionClient represent database values, including Decimal. React props are inline object types or named types. Hono is instantiated with a generic Variables map, enabling c.get("scope") to be typed.

Generics appear in apiFetch<T>, which promises a caller-selected response shape, and in withTenant<T>, which preserves the callback’s result type. This improves call-site inference but apiFetch<T> does not validate the received JSON; a backend shape change can still fail at runtime. Runtime response schemas would close that gap.

async functions return Promises. await pauses the function without blocking the Node event loop. Type narrowing appears in error instanceof Error, HTTPException, ZodError, and checks such as typeof token.backendToken === "string". Optional chaining and nullish coalescing handle missing values. The use of unknown in auth/error parsing is safer than any because code must inspect it.

Important types include TenantScope (trusted identity boundary), TransactionInput (write contract), PresentedTransaction (JSON boundary), Filters (UI state), SubscriptionCandidate (computed domain result), and AuthSession extensions (bridge token). TypeScript prevents many accidental mismatches; it cannot validate malicious JSON, guarantee database contents, prevent XSS, prove authorization, or make number arithmetic safe for money.

## 14. Hono Deep Dive

Hono is a lightweight Fetch-API-oriented web framework. Routes pair methods and paths with handlers. Middleware can run before and after next, so the logger can time the complete handler. Context wraps request, response helpers, headers, path/query access, and typed variables. HTTPException represents expected HTTP failures, while app.onError translates known and unknown exceptions.

Compared with Express, Hono uses web-standard Request/Response objects, has a smaller modern core, and provides good TypeScript ergonomics. Express has a larger ecosystem and familiar Node-specific middleware. Fastify would add a stronger plugin/schema ecosystem and high-throughput focus. Hono is suitable here because the domain logic is more important than framework machinery and the same app can be tested with app.request without a network server.

Validation is manual at handler boundaries with Zod rather than a Hono validator middleware. This is explicit but duplicates some schemas and keeps **index.ts** large. CORS allows configured frontend origins, selected headers/methods, exposed auth headers, credentials, and ten-minute preflight caching. CORS is a browser policy, not authorization: curl or a malicious server can still call the API, so bearer verification is essential.

## 15. Next.js 15 Deep Dive

The App Router derives URLs from **src/app** folders. layout.tsx wraps all pages; page.tsx defines route content; the catch-all auth route is a Next.js Route Handler. Components are server-side by default. The protected pages remain server components so they can call Auth.js before revealing the application shell. Components with hooks/events declare “use client”.

Data fetching is not performed in RSC beyond auth. The token and user are passed into client components, where TanStack Query fetches the separate backend. This yields rich caching and invalidation but exposes the backend token to browser JavaScript. An alternative is Next.js route handlers/server actions acting as a backend-for-frontend with HttpOnly cookies.

Hydration attaches interactivity to the client tree under Providers. The repository does not use Server Actions, middleware.ts, ISR, or static generation for business data. Environment variables beginning NEXT_PUBLIC are bundled for browser use; BACKEND_INTERNAL_URL stays server-only. Production code deliberately refuses a missing public backend URL rather than silently calling localhost.

On Vercel, the frontend is a natural fit. The backend is a separate long-running Hono Node service, currently documented on Render. Next config sets outputFileTracingRoot to the monorepo root and transpiles the shared source package. Production concerns include cross-origin cookie settings, exact HTTPS origins, cold backend instances, and keeping auth secrets consistent with their owning service.

## 16. UI/UX Explanation

The active information architecture separates overview, transactions, import, and rules under a persistent responsive shell. The design uses restrained emerald/neutral CSS variables, Geist typography, border-based grouping, compact tables, and responsive cards. shadcn-style primitives provide consistent Button, Input, Card, Badge, Table, Label, Separator, and Textarea behavior; they are source-owned components rather than a runtime black box.

Forms provide HTML constraints and backend validation. The auth form has pending/error/toast feedback. Overview has skeleton, error, empty, metrics, per-currency merchant rankings, chart, and recurring-charge states. Transactions use a desktop table and mobile cards. Import separates CSV and Paste Text workflows; text drafts expose field issues, default duplicate rows to unselected, and block save until selected rows validate. CSV retains its visible progress, selection, completion, history, and rollback states. These choices can be defended as reducing destructive mistakes and making uncertain financial data reviewable.

Accessibility strengths are semantic labels, screen-reader-only action names, aria-expanded navigation, role alert/dialog/alertdialog, keyboard-usable native controls, and chart summaries. Weaknesses are home-built dialogs without focus trapping/restoration or Escape handling, no skip link, potential color reliance for some status cues, and no formal WCAG test suite. The Playwright mobile test checks keyboard navigation only narrowly.

In an interview, do not say “I used shadcn so the UI was done.” Say: “I used source-owned primitives for accessible consistency, then designed domain flows—ambiguous date confirmation, duplicate opt-out, concurrency conflict, currency separation, and rollback—around finance-specific risks.”

## 17. Error Handling

Expected errors should be safe, actionable, and stable; unexpected errors should be logged with correlation data while returning a generic message. Hono’s onError maps HTTPException and ZodError, logs unknown errors, and hides stack traces. Request logging supplies x-request-id. Frontend apiFetch translates structured errors, and screens use inline blocks or toasts.

| Area | Current behavior | Risk | Better production approach |
| --- | --- | --- | --- |
| Request validation | Zod returns BAD_REQUEST plus issues | Issues may reveal schema internals; duplicated schemas | Field-safe error map and shared contracts |
| Authentication | Friendly wrapper messages; 401 middleware; private throttling keys | Enumeration and distributed abuse still require monitoring | Generic login response policy, alerts, MFA/recovery |
| Authorization | Foreign/missing records both 404 | Good concealment; must remain consistent | Central scoped repositories and audit review tooling |
| Concurrency | expectedUpdatedAt and conditional update produce 409 | Good, but UI only toasts and discards context | Refetch/merge conflict UI or version column |
| Database | Unknown Prisma errors become generic 500 | No classification/retry and sparse context | Map constraint/unavailable/timeout errors; telemetry |
| OpenAI | Config errors become explicit statuses | Provider timeout/schema failure becomes generic 500 | Timeout, bounded retry, provider error metric |
| Network/frontend | Error or toast | 401 does not clear session; no retry policy explanation | Central auth-expiry handler and targeted retries |
| Import | Atomic transaction | Per-row query latency; error lacks row context | Bulk validation/write and safe row diagnostics |
| Parser | Missing required fields remain null with explicit issues | Limited formats still require human correction | Locale profiles and richer structured diagnostics |
| Logging | Request metadata, unknown error object | No centralized sink/trace; error could include sensitive provider data | Structured redaction, tracing, Sentry/OpenTelemetry |
| Rendering | Component states plus route/global error boundaries | Recovery is generic and lacks telemetry | Error taxonomy, event capture, targeted recovery |

The code now has route and global Next.js error boundaries plus append-only audit logging, but no custom not-found page or documented retry/backoff policy. Dependency unavailability on /ready is represented as 503, while many normal-route database failures still become generic 500 responses. These are production gaps, not reasons to dismiss the architecture.

## 18. Security Review

### Authentication and credentials

Better Auth, rather than application code, hashes passwords and manages sessions. Password input is 8–128 characters at Ledgerly’s wrapper, but there is no email verification, recovery, MFA, or breached-password check. Login is throttled on both hashed email+IP and hashed IP-only keys; Redis is required in production, failures close with 503, and 429 includes Retry-After. Proxy-derived IP headers are trusted only when explicitly configured. A production answer should still say password length plus throttling is not a complete account-security lifecycle.

Auth.js’s cookie security is delegated to the library and environment. The Better Auth bearer token is copied into the Auth.js JWT and then exposed in the session object to client components. This makes XSS especially consequential: injected JavaScript could steal a token. A backend-for-frontend design that keeps upstream tokens server-side/HttpOnly would reduce exposure. Logout now revokes the presented Better Auth session before ending Auth.js state; sensitive account changes should also offer all-session revocation.

### Authorization and isolation

This is the strongest area. Scope comes from verified auth plus membership; routes do not trust ownership fields; every finance operation is scoped; foreign ids become absent; references are revalidated; and forced RLS provides database defense. The runtime must use ledgerly_app, not the owner. RLS policies cover Transaction, CategoryRule, ImportBatch, and AuditEvent but not Better Auth tables, which is appropriate only because those tables are accessed by trusted auth/provisioning code.

TeamId is stored on transactions but not used in query/RLS policy. If teams become a sharing boundary, the present model is incomplete. Likewise, organization membership suggests collaboration, but userId scoping prevents members from sharing. Clarify the tenancy contract before adding invitations.

### Validation, injection, XSS, CSRF, and CORS

Zod bounds text, array sizes, enums, dates, strings, currency, and amounts on most write paths. Prisma parameterizes queries; the executeRaw calls use tagged-template parameter binding, so SQL injection risk is low. CSV normalization now requires explicit type and currency rather than inferring financially meaningful values. Export correctly quotes CSV syntax and neutralizes leading =, +, -, or @ in user-controlled text cells to prevent spreadsheet-formula execution.

React escapes rendered strings, lowering stored-XSS risk. There is no dangerouslySetInnerHTML in the active screens. Content Security Policy and other response headers are not configured. CSRF mainly threatens cookie-authenticated state changes; API calls use an explicit bearer header, which browsers do not attach automatically. Better Auth/Auth.js endpoints still use cookies and must rely on library CSRF/origin protections. CORS restricts browser origins but is never a substitute for authentication.

### Sensitive data, files, AI, and dependencies

Raw transaction text is stored in plaintext, as are descriptions and balances. Database access, backups, logs, exports, and retention therefore require finance-grade controls. The request logger wisely omits bodies. OpenAI receives aggregated summaries and recurring candidates only, validated as structured output, but production still requires provider retention/legal review and user disclosure.

CSV content is parsed in-browser; only normalized rows are sent. Size and row caps limit abuse, but extension checks are not content security. If actual files/PDFs were uploaded, add MIME sniffing, antivirus/sandboxing, object-storage isolation, signed URLs, and asynchronous processing. CI now provisions PostgreSQL and Redis and runs migration, runtime-role grants, typecheck, tests, build, and Playwright; dependency scanning and lockfile review are still worthwhile additions.

### Security priorities

1. Add verification, recovery, MFA/passkeys, breached-password checks, and abuse monitoring.
2. Keep the backend token out of client JavaScript through a BFF if feasible.
3. Add CSP/security headers and a clear proxy/header trust deployment policy.
4. Define audit access/export, retention/deletion, encryption/KMS strategy, and backup restore tests.
5. Add database constraints for domain invariants and compound tenant references.
6. Confirm CI’s runtime-role RLS and browser jobs stay green in the hosted environment.

## 19. Performance and Scalability

The current profile is appropriate for a small assignment: deterministic parsing is CPU-cheap; keyset pagination avoids growing OFFSET cost; composite indexes match tenant/order filters; React Query prevents immediate refetches for twenty seconds; and frontend/backend can scale separately. Currency and subscription calculations are bounded to 5,000 and 2,000 rows, preventing unlimited memory use but silently making results incomplete for larger accounts.

The main database inefficiencies are preview/import N+1 duplicate queries, sequential creates, and application-side full-row analytics. Search uses contains/ILIKE-like behavior without a trigram/full-text index. Category/status/account indexes begin with organizationId but queries also include userId; measure plans against real distributions. Duplicate description matching happens in Node after fetching candidates. Subscription grouping likewise loads rows into memory.

At 10,000 users, keep stateless Hono replicas behind a load balancer, use managed PostgreSQL with pooling and replicas only where consistency permits, operate Redis rate limiting with metrics, and add observability. Replace per-row imports with set-based staging/insert and a deterministic fingerprint. Move analytics to SQL GROUP BY/materialized rollups and make result limits explicit. Use pg_trgm/full-text search. Queue OCR/PDF/very large imports, but leave short text synchronous. Use idempotency keys and an outbox for external side effects.

Serverless frontend cold starts are usually manageable; the backend’s Prisma connection behavior makes a long-running service or serverless-aware pool preferable. Redis provides the shared production limiter; the memory implementation is a local-development fallback only. TanStack Query keys are correctly user-scoped in active code; staleTime is a UX cache, not a shared server cache. No CDN should cache private API responses without per-user keys and private cache controls.

## 20. Testing Strategy

The repository has four test layers. Shared unit tests cover required parser samples, confidence, category precedence, nullable issues, impossible dates, zero amounts, explicit CSV type/currency, formula-safe serialization, quoted CSV, header mapping, and ambiguous date normalization. Backend pure tests cover scoped filters, per-currency merchant totals and normalization/caps, subscriptions, memory/Redis/fail-closed limiter behavior, hashed login keys, and Retry-After. DB-backed Hono integration tests cover auth isolation plus logout revocation, audit writes without raw finance text, append-only enforcement, and audit tenant isolation. Playwright covers account switching, CSV duplicate/rollback, Paste Text correction/save/duplicate behavior, merchant totals, and mobile keyboard navigation.

During this notes update against remediation commit **5149ebb**, typecheck and the production build passed; the six database-independent suites reported 32 passing tests and one real-Redis test skipped when Redis was unavailable. PostgreSQL-backed tests and Playwright were not run locally. The CI workflow is configured to provision both services and run the full chain, but configuration is not the same as observing a green hosted CI run. Never turn that into “all tests pass.”

Remaining coverage gaps include frontend component tests, active protected-page redirects, limit edge cases, category case collisions, AI provider timeout/invalid JSON, broader health/readiness failure combinations, session expiry/all-session revocation, accessibility/focus management, load behavior, and more intentional unscoped-query RLS proofs. The new tests cover parser rollover/issues, formula-safe export, limiter behavior, logout revocation, audit append-only/isolation, and the main Paste Text journey.

An interview-worthy plan follows the pyramid. Unit-test parsers and schemas extensively. Integration-test each API with a real runtime-role database and two tenants. Contract-test response shapes. Component-test form/error states. E2E-test a few critical journeys. Add security regression cases: unauthenticated request is 401; valid extraction produces exact fields; invalid extraction is rejected/warned; foreign list is empty; foreign update/delete is 404; tampered create ownership is ignored; a query intentionally missing scope is blocked by RLS; protected pages redirect; logout cannot reuse the upstream session after revocation.

## 21. Code Quality and Maintainability

Strengths include a clear workspace boundary, shared runtime contracts, scope-first query helpers, explicit presenter serialization, fail-fast environment parsing, deterministic domain functions, currency-aware analytics, useful empty/error states, and meaningful security tests. Naming such as getTenantScope, withTenant, buildTransactionWhere, presentTransaction, and reviewStatusForConfidence makes intent visible.

The remediation removed the 1,200-line unmounted dashboard and moved the important workflows into feature screens, eliminating a major source of duplicated types and obsolete analytics assumptions. The broader lesson remains: typechecking proves type consistency, not route reachability or behavioral correctness, so route and browser tests still matter.

The 900-line backend index is another deep module waiting to be split into auth, transaction, import, analytics, insight, and rule route modules plus services. Validation exists in shared contracts but query/body schemas are also locally duplicated. A repository layer could accept TenantScope at construction and expose no unscoped finance operation. Avoid ceremonial layers; the goal is to make unsafe calls difficult.

Other improvements are ESLint/Prettier scripts, coverage thresholds, OpenAPI generation, comments around the two-session auth model, schema check constraints, normalized category-rule keys, and removal of unused backendJwt. CI now exists, Docker Compose includes PostgreSQL and Redis, merchant analytics are explicit, audit events are append-only, and Next.js error boundaries exist. There is still no Dockerfile/deployment manifest or observability SDK/metrics/tracing backend.

## 22. Architecture Decisions and Trade-Offs

| Decision | Why it fits | Cost/alternative | Interview wording |
| --- | --- | --- | --- |
| Hono over Express/Fastify | Small Fetch-style typed API | Smaller ecosystem than Express; Fastify offers richer schemas/plugins | “The domain and isolation were the complexity, so I chose a thin transport.” |
| Prisma over raw SQL | Generated types, relations, migrations, parameterization | Abstraction/query tuning and RLS discipline still required | “Prisma improved velocity but did not replace authorization or SQL knowledge.” |
| PostgreSQL over MongoDB | Relations, transactions, Decimal, constraints, RLS | More schema planning; Mongo may ease flexible documents | “Finance ownership and integrity favor relational guarantees.” |
| Better Auth over custom auth | Password/session/JWT/org features | Framework coupling and two-system bridge complexity | “I refused to invent password security.” |
| Auth.js bridge | Natural Next.js server-page session | Duplicated sessions and token exposure | “It integrates backend identity with RSC, but I would simplify/revoke upstream sessions.” |
| Next.js over Vite SPA | RSC route guards, routing, Vercel model | More server/client complexity | “Server pages establish the session before mounting interactive screens.” |
| Tailwind + shadcn primitives | Fast consistent source-owned UI | Dense class strings; primitives still require product design | “The library supplied building blocks, not finance workflows.” |
| Shared-table tenancy | Economical and queryable | Every path must scope correctly | “Application filters plus forced RLS form defense in depth.” |
| Both user and organization scope | Strong personal privacy | Prevents true org sharing | “The current tenant is personal; collaboration needs an explicit policy change.” |
| Deterministic synchronous parser | Explainable, fast, testable | Limited formats/locale coverage | “For short bank text, regex is more controllable than an LLM.” |
| Separate frontend/backend | Independent scaling and clear API | CORS, deployments, token bridge | “It demonstrates a real service boundary at modest operational cost.” |
| TanStack Query | Caching, infinite pages, invalidation | Client complexity and broad refetches | “Server state is keyed by user and filters, not copied into ad-hoc global state.” |
| Keyset pagination | Stable performance at depth | Opaque cursor complexity | “createdAt plus id gives deterministic order.” |
| Computed subscriptions | No stale secondary table | Recomputes and is capped | “For v1 the heuristic is derived; scale would justify rollups.” |
| Aggregate-only AI | Privacy-aware narrative insights | Less personalization and provider dependency | “Raw source text never crosses that boundary.” |

## 23. Interview Questions and Model Answers

### Beginner and project questions

**1. Tell me about your project.** “Ledgerly is a private personal-finance ledger that normalizes bank text and CSV data. I built it as a TypeScript monorepo with Next.js, Hono, Better Auth, Prisma, and PostgreSQL. The defining concern is tenant safety: the backend derives ownership from verified identity, every query includes user and organization scope, and forced RLS backs that up.”

**2. Why this stack?** “Next.js gives server-aware routing and a strong React application model; Hono keeps the API layer thin; Zod supplies runtime contracts; Prisma accelerates type-safe relational work; PostgreSQL supplies transactions, Decimal, constraints, and RLS; Better Auth avoids custom password/session code. Each tool addresses a boundary rather than being chosen for novelty.”

**3. Explain the architecture.** “Auth.js integrates the Next.js frontend with a Better Auth session issued by Hono. Client queries send that bearer token to Hono. Middleware verifies identity and membership, route schemas validate input, domain modules parse or aggregate, and Prisma runs tenant operations inside a transaction that supplies RLS context to PostgreSQL.”

**4. What did you personally build if AI assisted you?** “AI accelerated scaffolding and suggested implementation patterns, but I take responsibility for the system. I verified code by tracing requests end to end, checking generated SQL/schema implications, writing behavioral tests, and remediating gaps across parser contracts, reachable UI, security, database policy, and CI. I can explain and modify the invariants, not just recite generated files.”

**5. What was hardest?** “The hardest part was not regex; it was keeping identity consistent across Auth.js, Better Auth, organization membership, Prisma, and PostgreSQL RLS. A feature can look protected while one export or duplicate reference leaks data, so I audited every read, mutation, aggregate, and indirect reference.”

### Authentication and authorization

**6. How does authentication work?** “AuthForm calls Auth.js credentials. The server-side provider calls Hono register/login, which delegates hashing and sessions to Better Auth. Auth.js stores the returned Better Auth token in its own JWT session. Protected Hono middleware sends request headers to Better Auth getSession and rejects missing identity.”

**7. Authentication versus authorization?** “Authentication establishes the user; authorization restricts what that user can do. Better Auth token verification authenticates. tenant.ts membership checks, scoped Prisma filters, and RLS authorize finance access.”

**8. What is a JWT and where is it stored?** “A JWT is a signed claims envelope, not encryption by default. Auth.js uses a JWT session in its cookie and includes backendToken. Better Auth’s JWT plugin can return a separate JWT saved as backendJwt, but current API calls use the Better Auth bearer/session token, not backendJwt. I would say that distinction explicitly.”

**9. What happens on expiry?** “The backend rejects the expired Better Auth session, while protected server pages also depend on Auth.js expiry. Today a client-side 401 becomes an error state; production should centrally clear Auth.js state, revoke/refresh as appropriate, and redirect to login.”

**10. What happens if someone changes userId in a body?** “Nothing useful. Zod schemas do not accept ownership, handlers construct data from c.get scope, and RLS checks transaction-local identity. The integration test deliberately sends foreign ownership and proves the row stays with the authenticated caller.”

**11. Why is frontend validation/protection insufficient?** “The browser belongs to the attacker. They can call the API directly and change JavaScript, URLs, and bodies. Only backend verification and database policy can protect data. Frontend guards are navigation and usability.”

**12. How would you support shared workspaces?** “First change the policy deliberately. Current rows require both user and organization, so members do not share. For organization-owned data I would scope reads by organization, model roles/permissions, preserve createdByUserId separately, validate team membership where needed, update RLS, and add member-role and cross-org tests.”

### Database and API

**13. What does Prisma do?** “It generates a typed client and migrations from the schema, maps relations, parameterizes normal queries, and serializes database concepts into TypeScript objects. It does not choose correct tenant filters, enforce business authorization, or eliminate the need to understand indexes and transactions.”

**14. What tables exist?** “Better Auth uses user, session, account, verification, jwks, organization, member, invitation, team, and teamMember. The domain uses transaction, category_rule, import_batch, and audit_event. Transaction links to user/organization, optionally import batch and another transaction as a duplicate; audit events preserve actor/action/resource metadata without cascading domain foreign keys.”

**15. Why indexes?** “Without an index PostgreSQL may scan every row. Composite indexes beginning with ownership and ending with createdAt/id support filtered keyset pagination. Indexes cost storage and slower writes, so I would verify them with EXPLAIN against real queries rather than add one per field blindly.”

**16. Explain one backend route completely.** “GET /api/transactions first runs scopedAuth. It validates limit/cursor and filters, decodes the cursor, and inside withTenant verifies that cursor ownership matches. It merges buildTransactionWhere with a lexicographic createdAt/id condition, orders descending, fetches one extra row, presents Decimal/Date fields, and returns nextCursor only when more data exists.”

**17. Is the API RESTful?** “Mostly. Transactions, imports, and rules are resources using standard methods. Preview, extract, export, and generate are action endpoints because they represent computations. I would add versioning, OpenAPI, idempotency, and stricter uniform envelopes.”

**18. How does optimistic concurrency work?** “The UI sends the row’s updatedAt as expectedUpdatedAt. The backend checks it, then includes the same old timestamp in updateMany, preventing a race between read and write. Zero updated rows becomes 409. This is optimistic concurrency control, not optimistic UI.”

### Extraction, frontend, and quality

**19. Explain extraction.** “A deterministic pipeline normalizes text, detects date/amount/type/balance/description/category/currency with ordered regex rules, applies user categories before explicit/built-in categories, and calculates field-completeness confidence. It returns null plus typed issues when required facts are unresolved instead of inventing defaults. Preview adds duplicate information; the user corrects issues and save revalidates and derives ownership.”

**20. Why not an LLM for extraction?** “Required formats are small and regular. Deterministic parsing is cheap, explainable, private, and regression-testable. For OCR or diverse statements I would use an LLM only behind structured schemas, confidence, review, redaction, and auditability.”

**21. Is extraction available in the UI?** “Yes. ImportScreen has a Paste Text tab that previews nullable drafts, displays field issues, leaves duplicates unchecked, allows corrections, validates with the shared transaction schema, and saves selected valid rows as NEEDS_REVIEW. The single-step extract endpoint also exists, but the UI intentionally uses the safer review-first flow.”

**22. Explain one frontend page.** “Transactions page is an RSC route guard: it checks Auth.js and passes token/user to LedgerApp. TransactionsScreen is a client component using user/filter-keyed infinite queries, manual add/edit/delete mutations, responsive representations, and expectedUpdatedAt. The backend remains authoritative.”

**23. How does CSV import work?** “The browser parses CSV, maps headers, requires explicit type and currency, resolves ambiguous dates explicitly, and normalizes rows. The backend previews duplicates within existing tenant data and the file. Commit atomically writes an ImportBatch, selected transactions, and an audit event; rollback deletes only rows linked to that tenant batch and records that action.”

**24. What tests matter most?** “Two-user adversarial tests: body tampering, foreign id update/delete, export/analytics/AI isolation, cursor ownership, foreign duplicate references, and RLS blocking an intentionally unscoped query. Then parser fixtures, concurrency conflicts, import atomicity, and protected-page E2E.”

### Security, production, and grilling questions

**25. What happens if the database is down?** “/ready returns 503 after SELECT 1 fails. Business queries throw through Hono’s generic handler and return 500. The frontend shows an error. Production should classify database-unavailable as 503, instrument it, use bounded retries only for safe transient operations, and alert.”

**26. How would you debug production?** “Start from request id and symptom, compare health/readiness, inspect structured logs and latency/error metrics, isolate frontend/auth/API/database, reproduce with a sanitized request, inspect query plans/locks, and correlate deployment changes. Preserve tenant privacy and never log raw finance bodies.”

**27. How would you scale to 10,000 users?** “The separated services and keyset pagination are a sound base. I would use managed pooled PostgreSQL, horizontal Hono replicas, Redis limits, set-based imports, indexed search, SQL/materialized aggregates, queue large ingestion, observability, and load tests. I would not prematurely queue a 10 KB regex parse.”

**28. What security risks remain?** “MFA/recovery/email verification are absent; the bearer token is visible to client JavaScript; CSP is not configured; raw finance text is stored in plaintext; proxy trust must be deployed correctly; audit access/retention is undefined; and local PostgreSQL/Playwright verification was incomplete. Throttling, session revocation, formula-safe export, audit immutability, and CI provisioning are implemented, but they do not make the app bank-grade.”

**29. How do audit logs work?** “Mutation routes call a typed AuditEvent allowlist in the same tenant transaction as the data change. Events contain actor, organization, action, resource type/id, request id, timestamp, and deliberately safe metadata—never raw transaction text. RLS restricts actor+organization access, runtime grants allow only select/insert, and a trigger rejects update/delete. A production policy still needs authorized review/export and retention.”

**30. How would you add idempotency?** “Accept an Idempotency-Key for create/import/extract, store tenant + key + request hash + response/status under a unique constraint, and return the original result for exact retries while rejecting key reuse with a different hash. A deterministic transaction fingerprint can complement but not replace request idempotency.”

**31. What would you improve first?** “First run and observe the full PostgreSQL/Redis/Playwright CI path and close any environment-specific failures. Next add MFA/recovery/email verification, CSP or a BFF, and domain constraints. Then improve audit review/retention, idempotency, set-based imports, and observability. The prior extraction, merchant, logout, throttling, CSV, audit, and CI-configuration gaps are already remediated.”

**32. What should you never claim?** Do not claim bank-grade production security, full JWT-based API verification, complete test success in this environment, organization collaboration, idempotent creates, unlimited analytics accuracy, or deployed observability. You may claim the active reviewed text-import UI, per-currency merchant totals, Redis-backed production throttling, explicit logout revocation, formula-safe export, append-only audit events, error boundaries, and a configured CI workflow because those are present in commit 5149ebb.

## 24. File-by-File Code Walkthrough

### Root and product files

**package.json** defines npm workspaces and orchestration scripts. Understand workspaces and command delegation. If wrong, packages cannot resolve or build consistently. Simple explanation: “the monorepo control panel.” Technical explanation: scripts fan out typecheck/build, Jest runs ESM serially, and Prisma commands point to the backend schema.

**README.md** documents intended product, API, setup, security controls, and deployment. Its extraction and merchant claims now match reachable feature screens, but continue comparing documentation to imports, route behavior, and tests. Interview question: “How do you prevent docs drift?” Answer with contract tests, generated API docs, and demo acceptance checks.

**docs/PRD.md** defines requirements and out-of-scope features. It is the reason for auth, parsing, analytics, and isolation decisions, but it is not proof that code meets them. The gap between PRD and active UI is an interview-ready lesson in verification.

**tsconfig.base.json, jest.config.cjs, playwright.config.ts** define strict compile/test behavior, ESM transforms, path aliases, browser base URL, and two dev web servers. If these are wrong, tests may validate a different module graph or fail before behavior runs.

**docker-compose.yml and .env.example** create local PostgreSQL on 5433 plus Redis, separate migrator/runtime roles, proxy-trust configuration, and cross-service URLs/secrets. Pay attention to DATABASE_URL versus DATABASE_MIGRATION_URL, production REDIS_URL, and absent optional AI examples. Never expose actual .env values. **.github/workflows/ci.yml** provisions both services and runs migrations, grants, generation, typecheck, tests, build, and Playwright.

### Shared domain package

**packages/shared/src/contracts.ts** exports runtime Zod schemas and TypeScript API shapes. isValidIsoDate round-trips UTC components to reject dates such as 2026-02-30. superRefine enforces sign/type. If wrong, invalid records cross both frontend and backend. Improvement: reuse filter schemas in Hono and validate responses.

**transaction-extractor.ts** is the core deterministic parser. Read top-down from extractTransaction to helpers. Pay attention to ordered precedence, nullable required fields, issue codes, calendar validation, numeric date ambiguity, category priority, and confidence. If wrong, plausible but incorrect financial rows could be offered for saving. Interview prompt: trace the Starbucks and incomplete samples manually.

**csv.ts** is a small state-machine parser handling quotes and escaped quotes, header auto-mapping, ambiguity detection, explicit type/currency normalization, normalized signed amounts, and formula-safe cell serialization. It is not a complete RFC/encoding library. If wrong, columns shift or money/date semantics corrupt.

### Database and backend

**schema.prisma** is the relational source of truth. Read auth entities, tenancy links, Transaction, ImportBatch, CategoryRule, AuditEvent, enums, then indexes. Ask which rules are only Zod and which are database constraints.

**migrations/** show actual SQL history, which can differ from the final schema. The June 24 migration strengthens RLS from organization-only to user+organization and adds imports/source; the July 14 migration adds actor+organization RLS and database-enforced append-only audit events. If migrations are skipped, production guarantees differ from local types.

**rls.sql and init-runtime-role.sql** explain the second security boundary and why runtime must not own tables. If wrong or run as owner, RLS may be bypassed. Ask: “Why is set_config local to a transaction?”

**env.ts** normalizes URLs, requires secrets, and rejects production localhost. **db.ts** owns Prisma and withTenant. **auth.ts** configures Better Auth adapters/plugins and seven-day sessions. Together they form runtime boot and identity infrastructure.

**tenant.ts** is the most important authorization file. It authenticates, verifies organization/team membership, resolves fallback context, provisions personal tenancy under serializable isolation, and updates sessions. If wrong, every route receives a false scope.

**index.ts** is the Hono composition root. Read middleware, auth wrappers, protected route registration, transaction/import/list/analytics/rule routes, error hook, schemas, and helper functions. Its imports reveal all domain dependencies; its exported app enables in-process tests. Its size is itself a maintainability finding.

**transaction-query.ts** guarantees filters begin with both ownership values. **transaction-presenter.ts** prevents Prisma Decimal/Date serialization surprises. **analytics.ts** groups totals/categories/merchants per currency; **merchant.ts** centralizes normalization; **subscriptions.ts** infers recurring gaps; **openai-insights.ts** constrains external data and output; **rate-limit.ts** implements local/Redis/fail-closed limiting; **security.ts** hashes auth identifiers and controls proxy trust; **audit.ts** constrains mutation event metadata; **seed.ts** creates only explicit demo tenants. A failure in any aggregator can leak data if it bypasses buildTransactionWhere/withTenant.

### Frontend

**frontend/src/auth.ts** is the two-auth-system bridge. Follow authorize, jwt callback, session callback, and URL resolution. If wrong, protected pages may authenticate while API calls lack or leak the credential. Ask why backendJwt is unused.

**app/layout.tsx** installs global presentation/providers. **login/register pages** render AuthForm. **overview/transactions/import/rules pages** are near-identical RSC guards; a protected layout could remove duplication. **api/auth/[...nextauth]/route.ts** exposes Auth.js handlers.

**AuthForm** handles credential submission, pending state, error code mapping, toast, refresh, and navigation. **LedgerShell** handles responsive navigation/logout/cache clearing. **LedgerApp** dispatches sections. If session props are wrong, all client screens fail to call the API.

**lib/api.ts** is the network boundary. It resolves public/internal URLs, attaches bearer credentials, and normalizes errors. **queries.ts** is the server-state boundary with user-keyed cache keys and broad invalidation. If query keys omit user identity, account-switch stale data becomes possible.

**OverviewScreen** renders currency summaries, per-currency merchant totals, and recurring data. **TransactionsScreen/Form** implement manual CRUD, filters, infinite pages, concurrency, and dialogs. **ImportScreen** orchestrates both CSV parse → preview → commit/rollback and Paste Text preview → repair → validated save. **RulesScreen** controls categorization. **presentation.tsx/types.ts** hold shared UI shapes and states.

**components/ui/** contains shadcn-style primitives; **globals.css** contains theme tokens and common form styling. **app/error.tsx** and **app/global-error.tsx** provide route-level and root-level recovery. The obsolete dashboard component was removed.

### Tests

**transaction-extractor.test.ts** and **contracts-csv.test.ts** prove nullable issues, calendar correctness, explicit CSV semantics, and formula safety. **tenant.test.ts** verifies filter construction but cannot prove database enforcement. **analytics-subscriptions.test.ts** verifies currency, merchant normalization/capping, and recurrence logic. **rate-limit.test.ts** and **security-routes.test.ts** cover fail-closed behavior, private keys, and Retry-After. **auth-routes.test.ts** uses real auth/database paths and covers two users, logout revocation, and append-only tenant-safe audits. **e2e/auth-isolation.spec.ts** covers account switching, import rollback, text correction/save/duplicates, merchant totals, and mobile keyboard flow.

## 25. “From Zero to Advanced” Concept Ladder

Use each row as a six-step rehearsal: intuition → web meaning → Ledgerly implementation → bug → interview explanation → production upgrade.

| Concept | Level 0: intuition | Level 1–2: web app and this project | Level 3: common bug | Level 4: interview-grade explanation | Level 5: production improvement |
| --- | --- | --- | --- | --- | --- |
| HTTP | Envelope exchange | Browser sends method/path/header/body; Hono returns status/JSON | Treating every failure as 200 | Explain request, response, methods, status classes | Versioning, timeouts, trace ids, cache policy |
| APIs | Published doorway | Hono routes are the frontend/backend contract | UI assumptions drift from response | Resource/action routes plus Zod boundaries | OpenAPI, contract tests, compatibility policy |
| Backend routing | Switchboard | Hono matches method/path to async handler | Public route by missing middleware pattern | Trace route registration and handler context | Modular routers and policy-by-default |
| Middleware | Security checkpoint | CORS/logger global; scopedAuth protected prefixes | New route omitted from protected list | Cross-cutting verified context before handlers | Protected router group and policy tests |
| TypeScript | Preflight checker | Types model props, scope, contracts, Prisma data | Believing types validate JSON | Compile-time guarantees plus Zod runtime checks | Strict lint, generated client/contracts |
| Prisma | Typed database translator | schema generates client; withTenant supplies transaction client | Unscoped findUnique/delete | ORM helps correctness, not authorization | Scoped repositories, query metrics, pooling |
| PostgreSQL schema | Rules for stored facts | Relations, Decimal, enums, indexes, RLS | App-only invariants or wrong role | Explain keys, relations, constraints, access paths | CHECK/compound constraints, backup/restore |
| Authentication | Identity badge | Better Auth verifies credentials/token; logout revokes it | Custom hashing or incomplete account lifecycle | Auth.js bridge versus Better Auth source of truth | MFA, recovery, rotation, all-session controls, BFF |
| Authorization | Door permission | Membership + scope + query + RLS | Checking only logged-in status | Resource access derives from server identity | Explicit RBAC/ABAC and audit policy |
| JWT | Signed claim envelope | Auth.js session JWT; optional Better Auth JWT unused by API | Calling every token a JWT or assuming encryption | Distinguish session JWT and bearer token | Short-lived access, key rotation, audience checks |
| Cookies/sessions | Remembered login | Auth.js cookie references/contains frontend session state | XSS/CSRF confusion and split expiry | Cookie automatic; bearer explicit | HttpOnly upstream token and synchronized logout |
| Multi-tenancy | Shared building, locked rooms | Shared tables tagged by org + user | One unscoped export/aggregate | Compare database/schema/row approaches | Formal organization sharing and policy matrix |
| Data isolation | No neighbor’s records | Scope filters plus forced RLS | Trusting body userId or DB owner bypass | Defense-in-depth with adversarial tests | CI RLS proofs, compound ownership integrity |
| Validation | Border inspection | Zod checks bodies; parser returns nullable issues | TypeScript-only validation or guessed financial fields | Parse untrusted input before domain work | Shared error map, DB constraints, response schemas |
| Error handling | Safe failure | Hono onError + frontend blocks/toasts/boundaries | Leaking internals or losing actionability | Expected versus unexpected errors | Taxonomy, retry policy, telemetry, targeted recovery |
| React rendering | UI from state | Client screens map query/mutation state to views | Duplicated server state and stale keys | Props/state, controlled forms, cache invalidation | Component tests, accessibility, smaller boundaries |
| Next.js App Router | Folders become pages | RSC pages check auth; client screens interact; error boundaries recover | Assuming redirect secures API | Server page gate plus independent backend auth | Protected layout/BFF and finer error segmentation |
| Transaction extraction | Turn text into fields | Ordered regex + confidence + nullable issues + review UI | Locale ambiguity or over-trusting heuristics | Explain helper order, issues, and human repair | Locale profiles, idempotency, OCR/LLM review |
| Security | Multiple locked layers | Auth, validation, scoped queries, RLS, Redis limits, audit | “We use auth, so it is secure” | Threat-model identities, inputs, outputs, operations | CSP/BFF, KMS, retention, incident response |
| Testing | Repeated proof | Unit + integration + E2E; two-user isolation | Mock-only security tests | Match test layer to invariant | Runtime-role DB CI, mutation testing, load/a11y |
| Deployment | Operate outside laptop | Separate Next/Hono, PostgreSQL roles, real origins | Migrations as runtime role or localhost prod URL | Secrets, builds, migrations, health/readiness | IaC, CI/CD, rollback, telemetry, restore drills |

The advanced habit connecting every concept is to ask three questions: “What data is untrusted?”, “Where does authority come from?”, and “What happens if this layer is bypassed?” In Ledgerly, TypeScript can be bypassed by HTTP, frontend checks by direct calls, Prisma filters by programmer error, and RLS by an owner role. Mature design acknowledges each boundary.

## 26. Weaknesses, Gaps, and How To Defend Them

| Weakness | Severity and why | Honest interview defense | Concrete improvement |
| --- | --- | --- | --- |
| README/PRD drift | Medium credibility risk | “Requirements are not evidence; I audited claims against imports and response code.” | Generated OpenAPI, acceptance matrix, docs CI |
| Parser format/locale coverage is limited | Medium data correctness | “Unknown required fields remain null with issues; the UI blocks save until the user repairs them.” | Locale profiles, more fixtures, explainable bank-specific adapters |
| No idempotency/unique transaction fingerprint | Medium duplicate risk | “Duplicates are advisory, not a hard invariant.” | Tenant-scoped fingerprint/idempotency records and override workflow |
| Backend token exposed to client JS | Medium/high XSS impact | “Needed for direct cross-origin client API calls; a BFF is safer.” | HttpOnly same-origin BFF proxy plus CSP |
| No MFA, recovery, or email verification | High production auth | “Redis throttling and safe logout exist, but abuse control is not a complete identity lifecycle.” | Verification, recovery, MFA/passkeys, breached-password checks |
| Proxy trust is deployment-sensitive | Medium abuse-control risk | “Forwarded IP headers are ignored unless explicitly enabled.” | Document trusted proxy topology and test deployed client-IP behavior |
| Analytics/subscriptions silently capped | Medium correctness at scale | “Bounds protect the service but can under-report.” | SQL aggregates, explicit truncation metadata/rollups |
| Import N+1 and sequential creates | Medium performance | “Atomic and clear within the 1,000-row assignment cap.” | Set-based duplicate lookup, createMany/staging table |
| Money becomes JavaScript number in analytics/UI | Medium precision | “DB storage is Decimal, but aggregation converts to number.” | Integer minor units/Decimal arithmetic end to end |
| Missing DB CHECK/ownership constraints | Medium defense depth | “Zod handles app writes; DB should also protect direct/future writers.” | CHECK sign/confidence/currency; composite tenant references |
| Team model not enforced on finance rows | Medium future-design ambiguity | “Current product is personal, not team-shared.” | Remove unused dimension or implement explicit team policy/RLS |
| Category unique key case behavior | Low/medium data quality | “Matching normalizes, storage uniqueness does not.” | Store normalizedMatchText with tenant unique constraint |
| Audit events have no product access/retention policy | Medium finance governance gap | “Writes are typed, same-transaction, RLS-scoped, and database-immutable.” | Authorized audit viewer/export, retention/legal-hold policy, tamper-evident archive |
| Hard deletes have no undo | Medium recovery risk | “The immutable audit proves the action but cannot restore the row.” | Soft delete/recovery window plus audited purge |
| Thin observability | High operational gap | “Request/security logs and readiness exist; there is no centralized metric/trace/error backend.” | Structured sink, metrics, traces, Sentry/OpenTelemetry, alerts |
| CI configured but local DB/E2E execution incomplete | Evidence gap | “32 DB-independent tests, typecheck, and build passed; hosted full-chain status must be observed separately.” | Run/retain PostgreSQL, Redis, and Playwright CI artifacts |

The mature defense pattern is not excuse-making. State the gap, scope its impact, show evidence that led you to it, and propose a sequenced fix. Avoid saying “AI generated that part” as a way to avoid ownership. Say AI accelerated it, then demonstrate that you can find, test, explain, and improve it.

## 27. Final Interview Revision Sheet

### 30-second pitch

Ledgerly is a TypeScript personal-finance ledger that turns bank text and CSV statements into private, reviewable transactions. Next.js/Auth.js provide the frontend session experience, Hono/Better Auth verify API identity, Prisma/PostgreSQL persist data, and every finance operation derives user plus organization scope server-side with forced RLS as defense in depth. Its strongest engineering theme is preventing cross-tenant leakage while making uncertain extraction explicit and sensitive mutations auditable.

### Architecture in one breath

Next.js RSC checks Auth.js → client sends Better Auth bearer → Hono verifies session/membership and Redis limits → Zod validates → domain parser/query runs → withTenant sets RLS variables → Prisma changes data plus same-transaction audit event → PostgreSQL forced RLS applies → presenter returns JSON → TanStack Query renders/invalidates.

### Auth, database, tenancy, and extraction

Auth: Better Auth owns passwords and backend sessions; Auth.js is a Next.js bridge. API calls use the opaque Better Auth token, not the optional backendJwt. Login is Redis-throttled with private keys and logout explicitly revokes the Better Auth session before ending Auth.js state.

Database: shared PostgreSQL tables, Prisma migrations/client, Decimal(12,2), relations, composite indexes, transaction/import/rule domain models, Better Auth tables, and append-only actor+organization-scoped AuditEvent records.

Tenancy: personal Organization + Member + Team, but finance data is scoped by both userId and organizationId. Application filters and forced RLS repeat the invariant. Do not call this organization sharing.

Extraction: deterministic ordered regex helpers, user/explicit/built-in category precedence, nullable required fields with typed issues, completeness confidence, tenant duplicate warning, and no idempotency. The active Paste Text UI previews, repairs, validates, and saves as NEEDS_REVIEW.

### Ten strongest talking points

1. Ownership is derived from verified context, never caller data.
2. RLS uses transaction-local variables and a non-owner runtime role.
3. Cross-tenant protection covers indirect paths such as export, aggregates, cursor, and duplicate references.
4. Auth.js and Better Auth roles are clearly separated.
5. Zod supplies runtime validation where TypeScript cannot.
6. Keyset pagination uses createdAt + id and validates cursor ownership.
7. PATCH implements real optimistic concurrency with a conditional write.
8. CSV ambiguity is explicit, spreadsheet formulas are neutralized, and import rollback is atomic.
9. Analytics never combines currencies and returns normalized merchant totals per currency; AI receives aggregates only.
10. Redis throttling, logout revocation, safe security logs, and append-only audit events close important abuse and traceability gaps.

### Likely grilling questions

Be ready to whiteboard register/login/logout, one audited PATCH, withTenant/RLS, parser issue-and-repair flow, CSV commit, account switching, and a foreign-id attack. Be ready to explain Redis fail-closed behavior, hashed rate-limit keys, why database owner bypass matters, why CORS is not authorization, why frontend token exposure increases XSS impact, and why Decimal storage does not guarantee number-safe analytics.

### Red flags to avoid saying

Do not say: “JWT encrypts the user”; “Prisma prevents data leaks”; “CORS blocks attackers”; “the frontend protects routes”; “RLS works regardless of database role”; “all organization members share data”; “all tests passed”; “the parser supports any bank”; “AI extracts transactions”; “the live UI includes AI insights”; “duplicate detection makes create idempotent”; or “this is production/bank-grade.”

### Top ten files to study first

1. **apps/backend/src/index.ts**
2. **apps/backend/src/tenant.ts**
3. **apps/backend/src/db.ts**
4. **apps/backend/prisma/schema.prisma**
5. **apps/backend/prisma/migrations/202607140001_add_audit_events/migration.sql**
6. **apps/backend/src/audit.ts** and **security.ts**
7. **packages/shared/src/contracts.ts**
8. **packages/shared/src/transaction-extractor.ts** and **csv.ts**
9. **apps/frontend/src/auth.ts** and **ledger-shell.tsx**
10. **apps/frontend/src/features/ledger/import-screen.tsx**

Then study TransactionsScreen, ImportScreen, analytics/subscriptions, auth-routes.test.ts, and the E2E isolation spec.

### Top ten topics to revise

1. Authentication versus authorization.
2. The two-session/token model.
3. Shared-table multi-tenancy and forced RLS.
4. Prisma transactions, Decimal, relations, and indexes.
5. Zod runtime validation versus TypeScript.
6. Hono middleware/request lifecycle.
7. Next.js server/client boundaries.
8. Deterministic extraction, confidence, and malformed input.
9. Keyset pagination and optimistic concurrency.
10. Security testing and production gaps.

### Final checklist

Before the interview, run or inspect a green hosted PostgreSQL/Redis/Playwright CI job, verify the deployed runtime role exercises forced RLS and audit immutability, demo Paste Text correction and per-currency merchants, rehearse login throttling/logout revocation, trace one audited mutation without notes, and keep the remaining limitations honest. If asked about AI assistance, lead with verification evidence and your ability to reason about changes. The best final sentence is: “I do not claim the prototype is bank-grade; I can show exactly which invariants it enforces today and the order in which I would harden it.”
