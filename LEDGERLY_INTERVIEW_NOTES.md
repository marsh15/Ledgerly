# Ledgerly Interview Notes for Vessify

This document is your interview study guide for explaining Ledgerly clearly from scratch. Read it in order. The goal is not to memorize every file blindly. The goal is to understand the system well enough that you can explain what happens when a user signs up, enters transaction text, and saves structured transaction data securely.

## 1. What the project does

Ledgerly is a full-stack personal finance transaction management app.

In simple words:

Ledgerly lets a user create an account, paste raw bank transaction text or import CSV transaction data, turn that messy input into structured transaction records, review the records, and save them privately.

Structured transaction data means fields like:

- date
- description
- amount
- currency
- transaction type
- balance after transaction
- category
- review status
- account label

The important engineering idea is:

Ledgerly is not just a UI. It is a full-stack system with authentication, protected backend APIs, validation, database models, transaction CRUD, imports, analytics, and user-specific data isolation.

Your short interview explanation:

```text
Ledgerly is a full-stack personal finance transaction extractor. The user can sign up, enter or upload transaction text, extract structured transaction details, review them, and save them securely. I built it using Next.js, TypeScript, Hono, PostgreSQL, Prisma, Better Auth, Tailwind, and shadcn/ui-style components. The main engineering focus was not only the UI, but the full-stack flow: authentication, protected APIs, database modeling, transaction CRUD, and user-specific data isolation. The project is not perfect, but I can clearly explain the architecture, what is complete, what is incomplete, and how I would make it production-ready.
```

Natural version:

```text
Ledgerly is a personal finance app that turns messy bank transaction text or CSV exports into clean ledger records. A user signs up, logs in, adds or imports transactions, reviews parsed fields, and saves them. The backend owns security: it validates the request, derives the user and workspace from the authenticated session, and stores each transaction with user and organization ownership in PostgreSQL through Prisma. I built the frontend with Next.js and TypeScript, the API with Hono, auth with Better Auth, and the UI with Tailwind and shadcn-style components.
```

## 2. Prerequisite concepts from scratch

### Full-stack application

A full-stack app has both:

- frontend: what the user sees in the browser
- backend: server code that handles secure logic, database access, and APIs

Ledgerly frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style components

Ledgerly backend:

- Hono API server
- TypeScript
- Better Auth
- Prisma
- PostgreSQL

### Frontend

The frontend is the browser-facing part of the app.

In Ledgerly, the frontend shows:

- login page
- register page
- overview dashboard
- transactions screen
- CSV import screen
- category rules screen

The frontend should make the app easy to use, but it should not be trusted for security decisions.

Important interview line:

```text
The frontend can display the current user, but it should never decide which user owns a transaction. Ownership must come from the authenticated backend session.
```

### Backend

The backend receives HTTP requests from the frontend.

Example:

```text
POST /api/transactions
```

The backend decides:

- is the user logged in?
- is the request body valid?
- what user owns this data?
- should the database create, update, list, or delete rows?
- what JSON response should be sent back?

### API

An API is a contract between frontend and backend.

Example:

The frontend sends:

```json
{
  "drafts": [
    {
      "date": "2025-12-11",
      "description": "STARBUCKS COFFEE MUMBAI",
      "amount": -420,
      "currencyCode": "INR",
      "type": "DEBIT"
    }
  ]
}
```

The backend returns:

```json
{
  "transactions": [
    {
      "id": "generated-id",
      "description": "STARBUCKS COFFEE MUMBAI",
      "amount": -420
    }
  ]
}
```

### Database

A database stores data permanently.

Ledgerly uses PostgreSQL.

PostgreSQL stores tables such as:

- user
- session
- organization
- transaction
- import_batch
- category_rule

### Prisma

Prisma is the database ORM.

ORM means Object Relational Mapper. Instead of writing raw SQL for every operation, the backend can write TypeScript like:

```text
create a transaction row with these fields
find transactions where userId equals the authenticated user's id
delete this import batch if it belongs to the authenticated user
```

Prisma uses `schema.prisma` to define database models.

### Authentication

Authentication answers:

```text
Who are you?
```

In Ledgerly:

- user registers with email and password
- Better Auth hashes and stores password-related account data
- Better Auth creates a session/token
- frontend stores a frontend session through Auth.js
- API calls include the backend token as a Bearer token
- backend verifies the token/session before protected actions

### Authorization

Authorization answers:

```text
What are you allowed to access?
```

A logged-in user should only access their own data.

If User A creates a transaction, User B must not be able to:

- list it
- update it
- delete it
- export it
- see it in analytics
- refer to it as a duplicate

This is one of Ledgerly's strongest topics.

### Session and JWT

A session is proof that the user logged in.

A JWT is a signed token that can carry identity information. The server can verify it and trust that it came from the auth system.

In Ledgerly, the frontend session stores the backend token returned by the backend auth flow. API requests use:

```text
Authorization: Bearer <token>
```

### Multi-tenancy

Multi-tenancy means one application serves multiple isolated users or workspaces.

In Ledgerly:

- every user has a personal organization/workspace
- transactions store `userId`
- transactions also store `organizationId`
- backend queries are scoped to the authenticated user and organization

Simple explanation:

```text
Multi-tenancy is like many private ledgers inside one shared app. Everyone uses the same application and database, but each user should only see their own rows.
```

### Data isolation

Data isolation means one user's private data does not leak to another user.

Ledgerly does this in two layers:

- application layer: backend queries include `userId` and `organizationId`
- database layer: PostgreSQL row-level security uses session variables set by `withTenant`

Best interview answer:

```text
The most important security decision in Ledgerly is that the frontend should never decide ownership. The backend should always take the user ID from the authenticated session or token. Every transaction query should be scoped by userId and organizationId, so even if someone changes an ID in the request, they cannot access another user's data.
```

### Zod validation

Zod is used to validate request data.

Validation means checking:

- required fields exist
- strings are not too long
- dates are valid
- amount is not zero
- debit amounts are negative
- credit amounts are positive
- currency code is three letters

Why this matters:

```text
The backend should not trust raw JSON from the browser. It validates the shape before using it.
```

### CRUD APIs

CRUD means:

- Create
- Read
- Update
- Delete

Ledgerly transaction CRUD:

- Create: `POST /api/transactions`
- Read: `GET /api/transactions`
- Update: `PATCH /api/transactions/:id`
- Delete: `DELETE /api/transactions/:id`

## 3. User flow

The main flow:

```text
User opens app
-> user signs up or logs in
-> Better Auth creates backend session/token
-> Auth.js keeps frontend session for Next.js
-> frontend shows protected dashboard
-> user adds transaction manually, pastes text, or imports CSV
-> frontend sends request to backend with Bearer token
-> backend verifies authenticated user
-> backend derives userId, organizationId, and teamId from auth context
-> backend validates request body with Zod
-> backend extracts or accepts structured transaction fields
-> backend saves transaction using Prisma
-> PostgreSQL stores transaction with userId and organizationId
-> backend returns JSON
-> frontend invalidates cached queries and updates the transaction list
```

For the simple assignment version:

```text
User opens app
-> signs up / logs in
-> Better Auth creates session/JWT
-> frontend shows dashboard
-> user enters transaction text
-> frontend sends request to backend
-> backend checks authenticated user
-> backend validates request body
-> backend extracts/structures transaction fields
-> backend saves transaction using Prisma
-> PostgreSQL stores transaction with userId
-> backend returns JSON
-> frontend updates transaction list
```

## 4. Folder structure

High-level structure:

```text
Ledgerly
├── apps
│   ├── frontend
│   │   └── Next.js app
│   └── backend
│       └── Hono API, auth, Prisma, database logic
├── packages
│   └── shared
│       └── shared validation, types, CSV helpers, transaction parser
├── e2e
│   └── Playwright tests
├── docs
│   └── project documents
├── package.json
├── docker-compose.yml
└── README.md
```

What each area means:

- `apps/frontend`: browser UI and Next.js pages
- `apps/backend`: API routes, auth config, database access, Prisma schema
- `packages/shared`: code reused by both frontend/backend, especially types, validation, and parser behavior
- `e2e`: end-to-end tests that drive the app like a user
- `docs`: product or planning docs

## 5. Frontend pages

### `apps/frontend/src/app/page.tsx`

This is the root page.

It redirects to:

```text
/overview
```

Interview explanation:

```text
The home route does not show a separate landing page. It sends users into the main app flow.
```

### `apps/frontend/src/app/login/page.tsx`

This renders the login screen.

It uses:

- `AuthForm` in login mode
- visual messaging about secure transaction extraction
- link to register

What to say:

```text
The login page is a public route. It collects email and password, then uses the frontend auth form to call the credentials provider.
```

### `apps/frontend/src/app/register/page.tsx`

This renders the registration screen.

It uses:

- `AuthForm` in register mode
- name, email, password fields
- link to login

What to say:

```text
Registration creates the user account and the backend provisions a personal workspace for that user.
```

### `apps/frontend/src/app/overview/page.tsx`

This is a protected page.

It calls `auth()` from the frontend auth bridge. If no backend token or user id exists, it redirects to `/login`.

What to say:

```text
The overview page is protected server-side. It checks the session before rendering the dashboard.
```

### `apps/frontend/src/app/transactions/page.tsx`

This is the transaction management page.

It checks auth, then renders:

```text
<LedgerApp section="transactions" ... />
```

The user can:

- list transactions
- filter transactions
- add a transaction
- edit a transaction
- delete a transaction
- load more pages

### `apps/frontend/src/app/import/page.tsx`

This is the CSV import page.

It lets the user upload bank CSV data, map/review rows, detect duplicates, import selected rows, and roll back imported batches.

### `apps/frontend/src/app/rules/page.tsx`

This is the category rules page.

Category rules let the user say:

```text
If description contains "starbucks", categorize as Dining.
```

These rules improve future parsing/categorization.

### `apps/frontend/src/app/api/auth/[...nextauth]/route.ts`

This exposes the Auth.js route handlers for the Next.js app.

Important distinction:

```text
Better Auth owns backend identity. Auth.js acts as the frontend session bridge.
```

## 6. Components

### `apps/frontend/src/components/auth-form.tsx`

This component renders the login/register form.

It:

- collects form data
- normalizes email
- calls `signIn("credentials")`
- handles errors
- redirects to `/overview` after success

Interview explanation:

```text
The AuthForm is the frontend entry point for login and registration. It does not directly write users to the database. It calls the credentials auth flow, which talks to the backend.
```

### `apps/frontend/src/auth.ts`

This configures Auth.js credentials auth.

It:

- receives email/password from the frontend form
- calls backend `/api/auth/register` or `/api/auth/login`
- receives `user`, `token`, and optional `jwt`
- stores backend token in the frontend session

Important:

```text
The frontend stores the backend token so later API calls can send it in the Authorization header.
```

### `apps/frontend/src/lib/api.ts`

This contains helpers for calling the backend.

Important function:

```text
apiFetch(path, token, init)
```

It adds:

```text
Authorization: Bearer <token>
```

What to say:

```text
All protected frontend API calls go through a helper that attaches the backend token.
```

### `apps/frontend/src/components/ledger-app.tsx`

This chooses which app screen to show based on the active section.

Sections:

- overview
- transactions
- import
- rules

### `apps/frontend/src/components/ledger-shell.tsx`

This is the shared app layout shell.

It handles the app frame/navigation around the different screens.

### `apps/frontend/src/features/ledger/transactions-screen.tsx`

This is the main transaction UI.

It supports:

- filtering
- listing
- adding transactions
- editing transactions
- deleting transactions
- mobile cards
- desktop table
- load more pagination

When saving:

- new transaction calls `createTransaction`
- existing transaction calls `editTransaction`
- delete calls `deleteTransaction`

### `apps/frontend/src/features/ledger/transaction-form.tsx`

This is the add/edit transaction form.

It collects:

- date
- description
- type
- amount
- currency code
- status
- category
- account label

It converts debit amounts to negative values and credit amounts to positive values before submitting.

### `apps/frontend/src/features/ledger/queries.ts`

This file uses TanStack Query for server state.

It contains:

- query keys
- transaction list query
- analytics query
- imports query
- rules query
- mutations for create/edit/delete/import/rules

Important concept:

```text
After a mutation succeeds, the app invalidates ledger queries so the UI refreshes with the latest backend data.
```

### `apps/frontend/src/features/ledger/import-screen.tsx`

This supports CSV import workflows.

It is responsible for:

- reading uploaded CSV data
- mapping columns
- previewing rows
- skipping duplicates by default
- importing selected rows
- rolling back import batches

### `apps/frontend/src/features/ledger/overview-screen.tsx`

This is the dashboard/analytics screen.

It reads analytics summary and subscription detection from the backend.

### `apps/frontend/src/features/ledger/rules-screen.tsx`

This manages category rules.

It calls backend category-rule endpoints.

### `apps/frontend/src/components/ui/*`

These are shadcn/ui-style primitives:

- button
- input
- textarea
- card
- table
- badge
- label
- separator

They keep the UI consistent.

## 7. Backend routes

The backend is in:

```text
apps/backend/src/index.ts
```

It uses Hono.

Hono is a lightweight TypeScript web framework for building HTTP APIs.

### Public health routes

```text
GET /health
GET /ready
```

`/health` checks if the app process is alive.

`/ready` checks if the database is reachable.

### Auth routes

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/*
```

Registration flow:

```text
frontend Auth.js credentials provider
-> backend /api/auth/register
-> backend forwards to Better Auth email sign-up
-> Better Auth creates user/session
-> backend ensures personal tenant exists
-> backend returns user and token
```

Login flow:

```text
frontend Auth.js credentials provider
-> backend /api/auth/login
-> backend forwards to Better Auth email sign-in
-> Better Auth verifies password
-> backend ensures personal tenant exists
-> backend returns user and token
```

### Auth middleware

The function `scopedAuth` calls:

```text
getTenantScope(c.req.raw.headers)
```

This checks the session and resolves:

- `userId`
- `organizationId`
- `teamId`

Protected route groups include:

- `/api/transactions`
- `/api/category-rules`
- `/api/analytics`
- `/api/insights`
- `/api/imports`

### `POST /api/transactions/preview`

Purpose:

Parse raw transaction text into editable drafts without saving.

Flow:

```text
authenticate user
-> rate limit
-> validate body
-> load category rules
-> create transaction drafts
-> detect duplicates
-> return drafts
```

This is useful because the user can review before saving.

### `POST /api/transactions`

Purpose:

Save one to 100 reviewed transaction drafts.

Flow:

```text
authenticate user
-> rate limit
-> validate drafts
-> start tenant-scoped database work
-> for each draft, create transaction row
-> force userId and organizationId from authenticated scope
-> return saved transactions
```

Most important security point:

```text
The route does not trust userId or organizationId from the request body. It writes ownership from the authenticated scope.
```

### `POST /api/transactions/extract`

Purpose:

Single-step parse and save.

Flow:

```text
authenticate user
-> validate raw text
-> parse/extract transaction fields
-> detect duplicate
-> save transaction
-> return saved transaction and duplicate metadata
```

### `GET /api/transactions`

Purpose:

List the authenticated user's transactions.

Supports:

- search
- date filters
- type
- category
- status
- account label
- currency
- minimum confidence
- cursor pagination

Security:

```text
The where clause includes authenticated userId and organizationId.
```

### `PATCH /api/transactions/:id`

Purpose:

Edit a transaction.

Flow:

```text
authenticate user
-> validate update body
-> find transaction by id plus userId plus organizationId
-> reject if not found
-> check expectedUpdatedAt for conflict protection
-> update row
-> return updated transaction
```

Important:

The route prevents editing another user's transaction by requiring both the id and authenticated ownership fields.

### `DELETE /api/transactions/:id`

Purpose:

Delete a transaction.

Security:

It first looks for a transaction with:

- matching id
- matching userId
- matching organizationId

If not found, it returns 404.

### `GET /api/transactions/export`

Purpose:

Export tenant-scoped transactions as CSV.

It uses the same filtering logic as listing and limits export size.

### Import routes

```text
POST /api/imports/preview
POST /api/imports
GET /api/imports
DELETE /api/imports/:id
```

Import preview:

- validates CSV-derived records
- checks duplicates already in database
- checks duplicates within the uploaded file
- marks duplicates as skipped by default

Import create:

- creates an `ImportBatch`
- creates selected transaction rows
- links transactions to the batch

Rollback:

- deletes transactions from a specific import batch
- deletes the import batch record
- only works for the authenticated user's batch

### Category rule routes

```text
GET /api/category-rules
POST /api/category-rules
PATCH /api/category-rules/:id
DELETE /api/category-rules/:id
```

Category rules are user/workspace-scoped.

They improve automatic categorization.

Example:

```text
matchText: "zomato"
category: "Dining"
```

### Analytics routes

```text
GET /api/analytics/summary
GET /api/analytics/subscriptions
```

Analytics summary returns things like:

- spend
- income
- net
- monthly series
- category totals
- duplicate count
- review count
- transaction count

Subscriptions detects recurring debit candidates from transaction history.

### AI insights route

```text
POST /api/insights/generate
```

This is optional and backend-only.

Important privacy point:

The backend sends aggregate summaries to OpenAI, not raw transaction text or user identity.

## 8. Prisma models

Prisma schema:

```text
apps/backend/prisma/schema.prisma
```

### `User`

Represents an account holder.

Important fields:

- `id`
- `name`
- `email`
- `emailVerified`
- `createdAt`
- `updatedAt`

Relations:

- sessions
- accounts
- organization memberships
- transactions
- category rules
- import batches

### `Session`

Represents a logged-in session.

Important fields:

- `token`
- `userId`
- `expiresAt`
- `activeOrganizationId`
- `activeTeamId`

Why this matters:

The backend uses the session to find the authenticated user and active workspace.

### `Account`

Stores auth provider account data.

For email/password auth, this is related to Better Auth account handling.

### `Jwks`

Stores signing keys for JWT behavior.

JWKS means JSON Web Key Set.

### `Organization`

Represents a workspace or tenant.

Ledgerly creates a personal organization for each user.

Important fields:

- `id`
- `name`
- `slug`

Relations:

- members
- teams
- transactions
- category rules
- import batches

### `Member`

Connects a user to an organization.

This is how the app knows:

```text
User X belongs to Organization Y.
```

### `Team` and `TeamMember`

Better Auth organization/team support is enabled.

Ledgerly currently creates a personal team for each personal workspace.

### `Transaction`

This is the core model.

Important fields:

- `id`
- `userId`
- `organizationId`
- `teamId`
- `date`
- `description`
- `type`
- `amount`
- `currencyCode`
- `balanceAfter`
- `category`
- `confidence`
- `status`
- `accountLabel`
- `duplicateOfId`
- `importBatchId`
- `source`
- `rawText`
- `createdAt`
- `updatedAt`

Important enums:

```text
TransactionType: DEBIT, CREDIT
TransactionStatus: SAVED, NEEDS_REVIEW
TransactionSource: TEXT, CSV, MANUAL
```

Interview explanation:

```text
The transaction table stores both the financial data and ownership data. The ownership fields are userId and organizationId, and those are what make tenant-scoped queries possible.
```

### `ImportBatch`

Represents one CSV import operation.

Important fields:

- filename
- totalRows
- importedRows
- skippedRows
- userId
- organizationId

Transactions created during an import can link back to this batch.

This enables rollback.

### `CategoryRule`

Represents custom categorization rules.

Important fields:

- userId
- organizationId
- matchText
- category

Example:

```text
If merchant text contains "amazon", category is Shopping.
```

## 9. Auth flow

This is one of the most important interview sections.

### Main auth components

Backend:

- `apps/backend/src/auth.ts`
- Better Auth
- Prisma adapter
- email/password enabled
- bearer plugin
- JWT plugin
- organization plugin

Frontend:

- `apps/frontend/src/auth.ts`
- Auth.js credentials provider
- stores backend token in frontend session

### Registration explained from scratch

When a user registers:

```text
1. User fills name, email, password on /register.
2. AuthForm calls signIn("credentials") with mode = register.
3. Auth.js credentials provider calls backend /api/auth/register.
4. Backend validates email/password/name.
5. Backend forwards request to Better Auth sign-up.
6. Better Auth creates the user and session.
7. Backend calls ensurePersonalTenant.
8. ensurePersonalTenant creates personal organization and team if needed.
9. Backend returns user and token.
10. Auth.js stores backendToken in its session.
11. User is redirected to /overview.
```

### Login explained from scratch

When a user logs in:

```text
1. User fills email and password on /login.
2. AuthForm calls signIn("credentials") with mode = login.
3. Auth.js calls backend /api/auth/login.
4. Backend forwards request to Better Auth sign-in.
5. Better Auth verifies password and creates/returns session token.
6. Backend ensures the user has a personal tenant.
7. Backend returns user and token.
8. Auth.js stores backendToken.
9. Protected pages can now call backend APIs.
```

### Protected API request

When the frontend calls a protected API:

```text
1. Frontend reads backendToken from session.
2. apiFetch sends Authorization: Bearer <token>.
3. Backend scopedAuth middleware calls getTenantScope.
4. Better Auth verifies the session/token.
5. getTenantScope returns userId, organizationId, and teamId.
6. Route handler uses those values for database access.
```

### Why Auth.js and Better Auth both appear

Better Auth is the backend source of truth.

Auth.js is used as the Next.js frontend session bridge.

Simple explanation:

```text
Better Auth handles real identity, sessions, bearer tokens, organizations, and password auth on the backend. Auth.js helps Next.js pages know whether the user is logged in and stores the backend token for frontend API calls.
```

## 10. Environment variables

Environment variables are configuration values that change between local development and production.

They are not hardcoded into the app.

Defined in:

```text
.env.example
apps/backend/src/env.ts
apps/frontend/src/lib/api.ts
apps/frontend/src/auth.ts
```

Important variables:

### `DATABASE_URL`

PostgreSQL connection string used by the app at runtime.

In this project, it should point to a non-owner runtime role so row-level security is actually tested.

### `DATABASE_MIGRATION_URL`

Database connection string used for migrations.

This usually needs stronger privileges than the runtime app role.

### `BETTER_AUTH_SECRET`

Secret used by Better Auth.

Must be long and random in production.

### `BETTER_AUTH_URL`

Backend auth base URL.

Local example:

```text
http://localhost:4000
```

### `AUTH_SECRET`

Secret used by Auth.js on the frontend.

### `AUTH_URL`

Frontend auth URL.

Local example:

```text
http://localhost:3000
```

### `FRONTEND_URL` or `FRONTEND_ORIGINS`

Allowed frontend origins for CORS and auth trust.

### `NEXT_PUBLIC_BACKEND_URL`

Backend URL exposed to browser-side frontend code.

Local example:

```text
http://localhost:4000
```

### `BACKEND_INTERNAL_URL`

Backend URL used by server-side frontend code.

In production, this can be an internal/private backend URL.

### Optional AI variables

- `AI_INSIGHTS_ENABLED`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

These control optional AI insights.

## 11. How to run locally

From the project root:

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Run backend:

```bash
npm run dev:backend
```

Run frontend:

```bash
npm run dev:frontend
```

Open:

```text
http://localhost:3000
```

Demo users after seeding:

```text
asha@example.com / Password123!
rohan@example.com / Password123!
```

Useful checks:

```bash
npm test
npm run test:e2e
npm run typecheck
npm run build
```

## 12. Shared package

Shared package:

```text
packages/shared
```

Why it exists:

Some logic should be consistent across frontend and backend.

Important files:

### `packages/shared/src/contracts.ts`

Contains Zod schemas and shared TypeScript types.

Important schemas:

- transaction input
- transaction update
- filters
- import preview body
- import create body

Important validation rules:

- date must be valid `YYYY-MM-DD`
- currency must be three-letter ISO code
- debit amount must be negative
- credit amount must be positive
- confidence must be between 0 and 1

### `packages/shared/src/transaction-extractor.ts`

Contains deterministic text parsing.

It extracts:

- date
- amount
- currency
- debit/credit type
- balance
- description
- category
- confidence score

Important point:

```text
The parser is deterministic. It does not use an LLM for core extraction.
```

The extractor supports examples like:

- `11 Dec 2025`
- `2025-12-10`
- currency symbols like rupee and dollar
- debit words like `debited`, `Dr`, `paid`
- credit words like `credited`, `Cr`, `received`

### `packages/shared/src/csv.ts`

Handles CSV-related parsing/helper behavior.

This supports import workflows.

## 13. What is complete

Ledgerly has these completed or substantially working parts:

- email/password registration
- login
- frontend session bridge
- protected pages
- backend protected APIs
- personal workspace provisioning
- transaction CRUD
- transaction validation
- transaction listing with filters
- cursor pagination
- CSV export
- CSV import preview
- CSV import create
- import rollback
- duplicate detection
- category rules
- analytics summary
- subscription detection
- optional backend-only AI insights from aggregates
- Prisma schema and migrations
- PostgreSQL row-level security scripts
- unit/integration tests
- Playwright end-to-end tests

Strongest completed engineering area:

```text
Tenant-scoped data access. The backend derives ownership from auth context, and tests check that one user cannot see another user's ledger data.
```

## 14. What is incomplete

Good interviewers respect honest answers.

Possible incomplete areas:

- no real bank account linking
- no OCR for statement screenshots or PDFs
- parser is deterministic and limited to known text patterns
- category prediction is rule-based, not fully intelligent
- subscriptions are computed, not persisted as a first-class subscription table
- AI insights are optional and may be disabled by environment variables
- no advanced role-based permissions beyond the personal workspace/team setup
- no full billing/payment flow
- limited admin tooling
- limited observability compared to a mature production system
- no comprehensive audit log for every data mutation

How to say this:

```text
Ledgerly is a strong full-stack prototype with real auth, persistence, validation, and isolation. It is not a bank-grade production finance system yet. The main areas I would improve are observability, audit logs, parser coverage, stronger rate limiting, more test coverage around edge cases, and production deployment hardening.
```

## 15. Bugs and limitations

Potential limitations to discuss:

### Parser limitations

The parser is deterministic.

That is good because it is predictable, cheap, and testable.

But it may fail on:

- unusual bank message formats
- ambiguous dates
- missing amounts
- unusual currencies
- multilingual transaction text
- messy statement formats

### Manual transaction path

The transaction form allows manual add/edit. This is useful, but manual data entry can create inconsistent descriptions or categories unless validation and normalization keep improving.

### Date ambiguity

Slash dates can be ambiguous.

Example:

```text
12/11/2025
```

This could mean December 11 or 12 November depending on locale. The README says slash dates are interpreted as `MM/DD/YYYY` unless day-first is obvious.

### Production auth hardening

Auth is implemented, but production systems should also consider:

- stricter password policies
- email verification
- forgot password flow
- account lockout strategy
- suspicious login detection
- secure cookie settings
- session revocation UI

### Observability

The backend logs requests with request ids, but a production system could add:

- structured log aggregation
- metrics
- tracing
- error tracking
- alerting

### Financial correctness

Finance apps need careful handling of:

- decimals
- currencies
- time zones
- duplicate detection
- imports from different banks
- export formats

Ledgerly uses Decimal in Prisma for money, which is good. Production would still need broad test cases.

## 16. Production improvements

If asked how to make Ledgerly production-ready, say:

### Security

- keep ownership server-side only
- keep every query scoped by authenticated user/workspace
- keep PostgreSQL row-level security enabled
- add audit logs for create/update/delete/import/rollback
- add stronger rate limits
- add CSRF review for auth-sensitive routes
- add session management and revocation
- enforce email verification
- protect secrets in deployment environment

### Reliability

- add more integration tests around imports and edge cases
- add background jobs for large CSV imports
- add retries where appropriate
- improve error boundaries in frontend
- add monitoring and alerting

### Data quality

- improve parser coverage with more bank formats
- allow user correction feedback to improve rules
- add better duplicate detection
- support more currencies and locales
- add audit history for edited transactions

### Performance

- keep indexes aligned with common filters
- paginate all large lists
- limit CSV export size or move large exports to background jobs
- cache analytics when transaction volume grows

### Deployment

- frontend on Vercel
- backend on Render/Fly/Railway or similar
- PostgreSQL managed database
- production environment variables
- migration workflow
- health and readiness checks
- CI pipeline for tests/typecheck/build

## 17. Testing

Tests exist in:

```text
packages/shared/src/__tests__
apps/backend/src/__tests__
e2e
```

Important examples:

### Shared tests

They test parser/contracts behavior.

Why this matters:

```text
The extraction and validation rules should work without needing the full app running.
```

### Backend tests

Examples:

- auth routes
- tenant-scoped transactions
- analytics/subscriptions
- tenant helper behavior

Most important test idea:

```text
User B should not see, delete, export, analyze, or duplicate-reference User A's transactions.
```

### E2E tests

Playwright tests simulate real browser behavior.

Examples:

- account switching does not show stale ledger data
- CSV import maps columns and can roll back
- mobile navigation is keyboard reachable

How to explain:

```text
Unit tests check small logic, integration tests check backend/database behavior, and Playwright tests check real user workflows in the browser.
```

## 18. Major topic cheat sheet

### Next.js

Next.js is the React framework used for the frontend.

Ledgerly uses:

- App Router
- server-side page protection with `auth()`
- frontend pages under `src/app`
- client components for interactive screens

Interview answer:

```text
I used Next.js for routing, protected pages, server/client component structure, and the frontend app shell.
```

### TypeScript

TypeScript adds types to JavaScript.

Why it helps:

- catches mistakes earlier
- makes API data shapes clearer
- improves editor support
- makes refactoring safer

In Ledgerly:

- frontend components are typed
- backend route helpers are typed
- shared package exports types
- Prisma generates database types

### Hono

Hono is the backend web framework.

It defines routes like:

```text
app.post("/api/transactions", ...)
app.get("/api/transactions", ...)
```

Why Hono:

- small
- fast
- TypeScript-friendly
- good for API servers

### PostgreSQL

PostgreSQL is the relational database.

Ledgerly uses it for:

- users
- sessions
- organizations
- transactions
- imports
- category rules

Important feature:

```text
PostgreSQL row-level security helps enforce tenant isolation at the database layer.
```

### Prisma

Prisma maps TypeScript code to database tables.

It provides:

- models
- migrations
- generated client
- type-safe queries

Ledgerly uses Prisma to create/read/update/delete rows.

### Better Auth

Better Auth handles backend authentication.

In Ledgerly, it provides:

- email/password auth
- sessions
- bearer tokens
- JWT plugin
- organization/team support
- Prisma adapter

### JWT/session

Sessions and tokens prove the user is logged in.

Ledgerly stores the backend token in the frontend session, then sends it to the API as a Bearer token.

### Authorization

Authentication says who the user is.

Authorization says what that user can access.

Ledgerly authorization rule:

```text
A user can only access transactions that match their authenticated userId and organizationId.
```

### Multi-tenancy

Ledgerly creates a personal workspace/organization for each user.

Transactions belong to both:

- user
- organization

This supports isolation and future workspace/team behavior.

### Data isolation

Data isolation is the main security story.

Ledgerly uses:

- server-derived ownership
- scoped Prisma queries
- PostgreSQL row-level security
- tests that check cross-user access is blocked

### Zod validation

Zod validates incoming data.

This prevents bad data from reaching the database.

### CRUD APIs

Ledgerly implements transaction CRUD plus import and category-rule APIs.

### Deployment

The README lists:

- frontend demo on Vercel
- backend demo on Render
- health check endpoint

In production, env variables must be configured carefully.

## 19. The strongest Vessify answer

Memorize the idea, not just the words:

```text
The most important security decision in Ledgerly is that the frontend should never decide ownership. The backend should always take the user ID and organization ID from the authenticated session or token. Every transaction query should be scoped by those values, so even if someone changes an ID in the URL, request body, or browser dev tools, they cannot access another user's data.
```

Expanded version:

```text
In Ledgerly, I treated ownership as a backend responsibility. The client sends transaction data, but the backend decides who owns it by reading the authenticated session. When creating a transaction, the server writes userId and organizationId from the session. When listing, updating, deleting, exporting, or analyzing transactions, the query is scoped to that same authenticated user and organization. I also added PostgreSQL row-level security so the database has an extra isolation layer. That prevents common multi-tenant security mistakes where a user can tamper with an ID and access someone else's data.
```

## 20. Interview questions and answers

### Q1. What is Ledgerly?

Ledgerly is a full-stack personal finance transaction management app. Users can register, log in, add transaction text or CSV data, convert it into structured transaction records, review it, and save it securely in a tenant-scoped ledger.

### Q2. What tech stack did you use?

I used Next.js and React for the frontend, TypeScript across the stack, Hono for the backend API, PostgreSQL as the database, Prisma as the ORM, Better Auth for backend authentication, Auth.js as the frontend session bridge, Tailwind CSS and shadcn/ui-style primitives for UI, TanStack Query for server state, and Playwright/Jest for testing.

### Q3. Why did you use TypeScript?

TypeScript helped make API contracts and data models clearer. For example, transactions have specific fields like date, amount, type, currency, and status. Types reduce mistakes when passing that data between frontend, backend, shared validation code, and Prisma.

### Q4. How does authentication work?

The user signs up or logs in through the frontend AuthForm. Auth.js credentials provider sends the credentials to the backend. The backend forwards auth work to Better Auth. Better Auth verifies or creates the user and returns a session token. The frontend stores that backend token in its session and sends it as a Bearer token for protected API calls.

### Q5. Why are both Auth.js and Better Auth used?

Better Auth is the backend source of truth for users, sessions, tokens, and organizations. Auth.js is used as a bridge in the Next.js frontend so protected pages can read a session and carry the backend token.

### Q6. What happens after registration?

After registration, the backend calls `ensurePersonalTenant`. That creates a personal organization and team for the user if one does not already exist. This gives every user a private workspace for their ledger data.

### Q7. What is a tenant?

A tenant is an isolated user or workspace inside a shared app. In Ledgerly, each user gets a personal organization, and transactions are tied to the authenticated user and organization.

### Q8. How do you prevent users from seeing each other's transactions?

The backend derives `userId` and `organizationId` from the authenticated session. It does not trust ownership from the frontend. Every transaction query includes the authenticated user's scope. PostgreSQL row-level security also checks session variables for the current user and organization.

### Q9. What is the core transaction save flow?

The frontend sends reviewed transaction drafts to `POST /api/transactions` with a Bearer token. The backend authenticates the user, validates the drafts with Zod, starts tenant-scoped database work, writes each transaction with userId and organizationId from the session, and returns the saved records as JSON.

### Q10. What does Prisma do in the project?

Prisma defines the database models and provides a TypeScript client for database operations. Ledgerly uses Prisma to create users, sessions, organizations, transactions, import batches, and category rules.

### Q11. What is Zod used for?

Zod validates request bodies and shared data contracts. For transactions, it validates dates, descriptions, amounts, currency codes, transaction type, status, and other fields before the backend writes anything to the database.

### Q12. How does transaction extraction work?

The extractor is deterministic. It scans raw text for date, amount, currency symbol/code, debit or credit indicators, balance, description, and category. It calculates a confidence score and marks low-confidence records as needing review.

### Q13. Does Ledgerly use AI for extraction?

No, core transaction extraction is deterministic and rule-based. Optional AI insights exist, but those are generated from aggregate summaries, not raw user transaction text.

### Q14. Why is deterministic parsing useful?

It is predictable, fast, cheap, and testable. The downside is that it may not handle every bank format, so production would need broader parser coverage or a more advanced extraction strategy.

### Q15. What are category rules?

Category rules are user-defined mappings from merchant text to a category. For example, if a description contains `zomato`, Ledgerly can categorize it as Dining.

### Q16. How does CSV import work?

The user uploads CSV data in the import screen. The frontend parses and maps columns. The backend preview endpoint validates records and checks duplicates. The user can then import selected rows. The backend creates an import batch and transaction rows linked to that batch.

### Q17. How does rollback work?

CSV-imported transactions are linked to an `ImportBatch`. If the user rolls back an import, the backend deletes transactions from that batch and then deletes the batch record, scoped to the authenticated user and organization.

### Q18. What is cursor pagination?

Cursor pagination loads data page by page using a stable cursor instead of page numbers. Ledgerly uses a cursor based on `createdAt` and `id` so transaction listing can load more records efficiently.

### Q19. What happens if a user changes an ID in the URL?

The backend still checks ownership. For update and delete routes, it searches for a transaction matching both the requested id and the authenticated user's `userId` and `organizationId`. If it does not match, the backend returns 404.

### Q20. What are row-level security policies?

Row-level security is a PostgreSQL feature that restricts which rows a database role can read or write. Ledgerly sets current user and organization variables during tenant-scoped work, and RLS policies require rows to match those values.

### Q21. Why use both backend filters and RLS?

Defense in depth. Backend filters are the normal application logic. RLS is a database safety layer in case a query is accidentally written without proper tenant filtering.

### Q22. What tests are important?

The most important tests are isolation tests. They verify that User B cannot see, export, delete, analyze, or reference User A's transaction data. There are also parser tests, backend route tests, and Playwright E2E tests.

### Q23. What would you improve first?

I would improve production hardening: audit logs, stronger rate limiting, email verification, better observability, broader parser test cases, and more robust import handling for large files.

### Q24. What was the hardest part?

The hardest part was designing the full-stack boundary correctly. The frontend needs a smooth experience, but the backend must own validation, authentication, authorization, and data isolation. The project became much stronger when I treated ownership as server-derived instead of client-provided.

### Q25. What are you proud of?

I am proud that the project is not just a UI demo. It has protected APIs, real database models, Prisma migrations, tenant-scoped queries, row-level security, transaction CRUD, import workflows, and tests around user isolation.

### Q26. What is one honest limitation?

The parser is rule-based and will not understand every possible bank format. I would expand parser coverage with more real examples, improve ambiguous date handling, and consider a review-first AI-assisted path only if privacy and reliability requirements are met.

### Q27. How would you explain the architecture in 30 seconds?

The Next.js frontend handles pages, forms, and dashboard UI. Auth.js stores a frontend session that includes a backend token. The Hono backend verifies that token with Better Auth, resolves the authenticated tenant, validates requests with Zod, uses shared parser logic to structure transaction data, and saves rows through Prisma into PostgreSQL. Every protected database query is scoped by user and organization.

### Q28. What is the database ownership model?

Transactions, import batches, and category rules all store `userId` and `organizationId`. The authenticated session determines those values. That makes it possible to keep one shared database while isolating each user's ledger data.

### Q29. Why is `expectedUpdatedAt` used in updates?

It helps prevent overwriting changes made after the user opened the transaction. If the transaction changed in the database after the UI loaded it, the backend returns a conflict instead of silently overwriting newer data.

### Q30. What is the difference between authentication and authorization in Ledgerly?

Authentication is login: proving the user is who they claim to be. Authorization is access control: making sure the logged-in user can only access their own tenant-scoped transactions, imports, analytics, and category rules.

## 21. File-by-file memory map

Use this for quick review before the interview.

### Root

```text
package.json
```

Workspace scripts for dev, build, typecheck, tests, Prisma, and seed.

```text
README.md
```

Project overview, stack, setup, API list, parser behavior, and demo information.

```text
docker-compose.yml
```

Local PostgreSQL setup.

### Backend

```text
apps/backend/src/index.ts
```

Main Hono API routes.

```text
apps/backend/src/auth.ts
```

Better Auth configuration.

```text
apps/backend/src/tenant.ts
```

Resolves authenticated user/workspace scope and creates personal tenant.

```text
apps/backend/src/db.ts
```

Prisma client and `withTenant`.

```text
apps/backend/src/env.ts
```

Backend environment variable validation.

```text
apps/backend/src/isolation.ts
```

Tenant scope helper types and query scoping helpers.

```text
apps/backend/src/transaction-query.ts
```

Builds transaction filters without weakening tenant scope.

```text
apps/backend/src/transaction-presenter.ts
```

Converts Prisma transaction rows into API response shape.

```text
apps/backend/src/analytics.ts
```

Analytics summary logic.

```text
apps/backend/src/subscriptions.ts
```

Recurring subscription detection.

```text
apps/backend/src/openai-insights.ts
```

Optional AI insights from aggregate summaries.

```text
apps/backend/src/rate-limit.ts
```

Rate limiting helper.

```text
apps/backend/prisma/schema.prisma
```

Database models.

```text
apps/backend/prisma/rls.sql
```

PostgreSQL row-level security policies.

### Frontend

```text
apps/frontend/src/auth.ts
```

Auth.js credentials session bridge.

```text
apps/frontend/src/lib/api.ts
```

Backend API fetch helpers.

```text
apps/frontend/src/app/login/page.tsx
apps/frontend/src/app/register/page.tsx
```

Public auth pages.

```text
apps/frontend/src/app/overview/page.tsx
apps/frontend/src/app/transactions/page.tsx
apps/frontend/src/app/import/page.tsx
apps/frontend/src/app/rules/page.tsx
```

Protected app pages.

```text
apps/frontend/src/components/auth-form.tsx
```

Login/register form.

```text
apps/frontend/src/components/ledger-app.tsx
apps/frontend/src/components/ledger-shell.tsx
```

Main app layout and screen selection.

```text
apps/frontend/src/features/ledger/queries.ts
```

TanStack Query hooks and mutations.

```text
apps/frontend/src/features/ledger/transactions-screen.tsx
```

Transaction CRUD UI.

```text
apps/frontend/src/features/ledger/import-screen.tsx
```

CSV import UI.

```text
apps/frontend/src/features/ledger/overview-screen.tsx
```

Dashboard analytics UI.

```text
apps/frontend/src/features/ledger/rules-screen.tsx
```

Category rules UI.

### Shared

```text
packages/shared/src/contracts.ts
```

Zod schemas and shared types.

```text
packages/shared/src/transaction-extractor.ts
```

Deterministic transaction parser.

```text
packages/shared/src/csv.ts
```

CSV helper logic.

### Tests

```text
apps/backend/src/__tests__
```

Backend/auth/isolation/analytics tests.

```text
packages/shared/src/__tests__
```

Parser and shared contract tests.

```text
e2e/auth-isolation.spec.ts
```

Browser tests for auth isolation and import workflows.

## 22. How to explain the full flow on a whiteboard

Draw this:

```text
Browser / Next.js
    |
    | login/register
    v
Auth.js credentials provider
    |
    | POST /api/auth/login or /register
    v
Hono backend
    |
    | forwards to Better Auth
    v
Better Auth + Prisma
    |
    | creates/verifies session
    v
Backend returns token
    |
    | stored in frontend session
    v
Frontend dashboard
    |
    | Authorization: Bearer token
    v
Protected Hono API
    |
    | getTenantScope()
    v
Validated tenant scope
    |
    | Zod validation
    v
Transaction parser / CRUD logic
    |
    | Prisma with userId + organizationId
    v
PostgreSQL
    |
    | JSON response
    v
Frontend updates UI
```

Say this while drawing:

```text
The key boundary is between the frontend and backend. The frontend can request actions, but the backend verifies auth, validates input, derives ownership, and scopes every database operation.
```

## 23. Final rehearsal script

Use this when practicing out loud:

```text
Ledgerly is a full-stack personal finance app for turning raw transaction text or CSV exports into structured ledger records. The frontend is built with Next.js, TypeScript, Tailwind, and shadcn-style components. The backend is a Hono API using Better Auth, Prisma, and PostgreSQL.

The core flow is: a user registers or logs in, Better Auth creates a backend session/token, Auth.js keeps that token in the frontend session, and protected pages use it to call the backend. When the user creates or imports transactions, the backend verifies the token, resolves the authenticated user and organization, validates the request with Zod, parses or accepts structured transaction fields, and saves rows through Prisma.

The most important engineering decision is data isolation. The frontend never decides ownership. The backend always writes and queries using the userId and organizationId from the authenticated session. On top of that, PostgreSQL row-level security provides another layer of protection. That means changing IDs in the browser or request body should not let one user access another user's transactions.

The app is not perfect. The deterministic parser has limitations, AI insights are optional, and production would need stronger observability, audit logs, email verification, and broader parser coverage. But the project demonstrates the core full-stack skills: auth, protected APIs, database modeling, validation, CRUD, imports, analytics, testing, and tenant-scoped security.
```
