# Ledgerly

Ledgerly is a secure personal finance transaction management app built as a fullstack assignment. Authenticated users can paste raw bank transaction text, preview and save structured drafts, manage category rules, export CSVs, and view only their own tenant-scoped transactions.

The original assignment PRD lives in [docs/PRD.md](docs/PRD.md). This package keeps the required secure extraction workflow and expands it with transaction-management features documented below.

## Tech Stack

- Backend: Hono + TypeScript
- Auth: Better Auth email/password, seven-day sessions, bearer/JWT plugins, organization/team plugin
- Database: PostgreSQL + Prisma
- Frontend: Next.js 15 App Router + TypeScript + Server Components
- Frontend session bridge: Auth.js credentials provider stores the Better Auth bearer token in the Auth.js JWT session
- UI: Tailwind CSS + shadcn/ui-style primitives
- Tests: Jest + ts-jest
- E2E: Playwright smoke test

## Architecture

```text
Next.js frontend
  -> Auth.js credentials session bridge
  -> Hono backend
  -> Better Auth verifies identity and organization/team context
  -> Transaction parser and tenant-scoped service logic
  -> Prisma
  -> PostgreSQL
```

Better Auth is the source of truth for registration, password hashing, login, sessions/tokens, and organization/team membership. Auth.js is only the frontend session bridge used by Next.js pages and client components.

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
```

Run backend and frontend in separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open `http://localhost:3000`.

## Environment

`.env.example` includes the required variables:

```bash
DATABASE_URL="postgresql://ledgerly:ledgerly@localhost:5433/ledgerly?schema=public"
BETTER_AUTH_SECRET="replace-with-at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:4000"
JWT_SECRET="replace-with-at-least-32-random-characters-if-you-enable-custom-jwt-signing"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
AUTH_SECRET="replace-with-at-least-32-random-characters-for-authjs"
AUTH_URL="http://localhost:3000"
FRONTEND_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
BACKEND_INTERNAL_URL="http://localhost:4000"
```

`FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_URL` are kept for compatibility; `FRONTEND_URL` and `NEXT_PUBLIC_BACKEND_URL` match the PRD wording.

For production deployment, set the URL values to the deployed origins instead of localhost:

- `BETTER_AUTH_URL`: public backend API origin, for example `https://api.yourdomain.com`
- `FRONTEND_URL`, `AUTH_URL`, and `FRONTEND_ORIGIN`: public frontend origin, for example `https://yourdomain.com`
- `FRONTEND_ORIGINS`: comma-separated frontend origins if you deploy preview/staging and production frontends
- `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_API_URL`: public backend API origin used by the browser
- `BACKEND_INTERNAL_URL`: backend origin reachable from the frontend server runtime

Email/password registration is open to any user with a valid email address and an 8+ character password. New users receive a personal workspace during registration or first login.

## Commands

```bash
npm test
npm run test:e2e
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:push
```

Use `prisma:migrate` for normal local setup. `prisma:push` is available for quick disposable databases.

## API

```http
POST /api/auth/register
POST /api/auth/login
POST /api/transactions/preview
POST /api/transactions
POST /api/transactions/extract
GET /api/transactions?limit=10&cursor=<opaque_cursor>
GET /api/transactions/export
DELETE /api/transactions/:id
GET /api/category-rules
POST /api/category-rules
PATCH /api/category-rules/:id
DELETE /api/category-rules/:id
```

All transaction and category-rule endpoints are protected. The backend derives `userId`, `organizationId`, and `teamId` from the verified Better Auth session; client-supplied ownership fields are ignored.

`POST /api/transactions/preview` accepts raw text and returns editable drafts without saving:

```json
{
  "text": "raw bank transaction text...",
  "accountLabel": "Personal"
}
```

The preview parser supports multiple transactions separated by blank lines. Each draft includes `draftId`, `sourceText`, `status`, `accountLabel`, and duplicate metadata:

```json
{
  "drafts": [
    {
      "draftId": "draft-1",
      "date": "2025-12-11",
      "description": "STARBUCKS COFFEE MUMBAI",
      "amount": -420,
      "type": "DEBIT",
      "balanceAfter": 18420.5,
      "category": "Dining",
      "confidence": 1,
      "status": "SAVED",
      "accountLabel": "Personal",
      "sourceText": "raw source text",
      "duplicate": {
        "isDuplicate": false,
        "existingId": null
      }
    }
  ]
}
```

`POST /api/transactions` saves one to 100 reviewed drafts:

```json
{
  "drafts": [
    {
      "date": "2025-12-11",
      "description": "STARBUCKS COFFEE MUMBAI",
      "amount": -420,
      "type": "DEBIT",
      "balanceAfter": 18420.5,
      "category": "Dining",
      "confidence": 1,
      "status": "SAVED",
      "accountLabel": "Personal",
      "sourceText": "raw source text"
    }
  ]
}
```

The response is:

```json
{
  "transactions": [
    {
      "id": "transaction_id",
      "date": "2025-12-11",
      "description": "STARBUCKS COFFEE MUMBAI",
      "amount": -420,
      "type": "DEBIT",
      "balanceAfter": 18420.5,
      "category": "Dining",
      "confidence": 1,
      "status": "SAVED",
      "accountLabel": "Personal",
      "duplicateOfId": null,
      "createdAt": "2025-12-11T10:00:00.000Z"
    }
  ]
}
```

`POST /api/transactions/extract` remains as a single-step parse-and-save endpoint. It accepts:

```json
{
  "text": "raw bank transaction text...",
  "accountLabel": "Personal"
}
```

Successful extraction returns a saved `transaction` and duplicate metadata. Returned transaction fields are `id`, `date`, `description`, `amount`, `type`, `balanceAfter`, `category`, `confidence`, `status`, `accountLabel`, `duplicateOfId`, and `createdAt`.

Transaction listing returns `items`, `nextCursor`, and a temporary `transactions` alias for frontend compatibility. `nextCursor` is an opaque cursor containing the last row's `createdAt + id`; incoming cursors must belong to the authenticated tenant before they are accepted. Supported filters are:

- `search`
- `dateFrom`
- `dateTo`
- `type=DEBIT|CREDIT`
- `category`
- `status=SAVED|NEEDS_REVIEW`
- `accountLabel`
- `minConfidence`

`GET /api/transactions/export` accepts the same filters and returns up to 1,000 tenant-scoped rows as CSV. CSV columns are `date`, `description`, `amount`, `type`, `balanceAfter`, `category`, `confidence`, `status`, `accountLabel`, and `createdAt`.

`DELETE /api/transactions/:id` deletes only a transaction owned by the authenticated user and organization.

Category rules are tenant-scoped phrase-to-category mappings. They are applied before explicit parsed categories and built-in categories:

```json
{
  "matchText": "starbucks",
  "category": "Client Meals"
}
```

`POST /api/category-rules` upserts by `organizationId + matchText`. `PATCH /api/category-rules/:id` and `DELETE /api/category-rules/:id` require the rule to belong to the authenticated user's tenant.

Error responses use:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## Parser Assumptions

The parser is deterministic and does not use an LLM.

Supported dates:

- `11 Dec 2025`
- `12/11/2025`
- `2025-12-10`

Slash dates are interpreted as `MM/DD/YYYY`, so `12/11/2025` becomes `2025-12-11`.

Supported money and debit indicators:

- `-420.00`
- `₹1,250.00 debited`
- `₹2,999.00 Dr`
- `->` and `→` balance arrows

Confidence is a completeness score:

- Date found: `+0.25`
- Amount found: `+0.25`
- Description found: `+0.20`
- Debit/credit type found: `+0.15`
- Balance found: `+0.10`
- Category found: `+0.05`

## Required Samples

```text
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
```

```text
Uber Ride * Airport Drop
12/11/2025 -> ₹1,250.00 debited
Available Balance -> ₹17,170.50
```

```text
txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
```

All three are covered by Jest parser tests.

## Auth And Isolation Strategy

Protected transaction routes call Better Auth with the incoming cookie or bearer token, resolve the authenticated user's active organization/team membership, and build Prisma filters from server-side auth context only.

Transaction reads and writes are scoped by both:

- authenticated `userId`
- authenticated `organizationId`

The backend never trusts `userId`, `organizationId`, or `teamId` from request bodies, query strings, or frontend session display state. If a user tampers with a payload, those fields are ignored because ownership comes from the verified session.

## Cursor Pagination

Transactions are sorted by `createdAt desc, id desc`. The backend fetches `limit + 1` rows, returns the requested page, and returns an opaque composite cursor when another page exists. Listing and export filters are always combined with the authenticated `userId` and `organizationId`.

Prisma indexes support tenant-scoped listing and date lookup:

- `userId + createdAt`
- `organizationId + createdAt`
- `userId + organizationId + createdAt + id`
- `organizationId + createdAt + id`
- `userId + date`
- `organizationId + date`
- `organizationId + status`
- `organizationId + category`
- `organizationId + accountLabel`

## Transaction Management

Draft previews make bulk import reviewable before persistence. Blank-line-separated raw text produces multiple drafts, and drafts with confidence below `0.85` are marked `NEEDS_REVIEW`; higher-confidence drafts are marked `SAVED`.

Duplicate detection compares date, amount, account label, and normalized description inside the authenticated tenant. Duplicate matches return the existing transaction ID in preview metadata or save `duplicateOfId` for single-step extraction.

Bulk draft save treats `duplicateOfId` as untrusted input. If a client sends it, the backend keeps it only when the referenced transaction belongs to the authenticated `userId + organizationId`; cross-tenant or fabricated IDs are stored as `null`.

Category resolution uses this precedence:

1. User category rules
2. Explicit parsed category text
3. Built-in merchant mappings when enabled

## Postgres RLS

The application enforces isolation in backend queries and the Prisma migration enables and forces PostgreSQL RLS on `transaction` and `category_rule`. Tenant-scoped Prisma operations run inside a transaction that sets `app.current_organization_id` before touching those tables.

For databases created before the migration was added, the same policy SQL is available at `apps/backend/prisma/rls.sql`:

```bash
psql "$DATABASE_URL" -f apps/backend/prisma/rls.sql
```

## Verification Checklist

1. Register User A.
2. Paste and save all three sample transactions.
3. Show the transaction table with date, description, amount, type, balance, category, and confidence.
4. Log out.
5. Register or log in as User B.
6. Show User B cannot see User A's transactions.
7. Explain that Better Auth owns auth and tenant membership.
8. Explain that backend transaction queries derive ownership from the verified session.
9. Explain deterministic parser logic, MM/DD slash dates, confidence scoring, pagination, and indexes.
10. Run `npm test` and show the passing parser, auth route, and isolation tests.
11. Run `npm run test:e2e` with Postgres running to show User A's saved transaction is hidden from User B.

## Known Trade-Offs

- Auth.js is used only as a Next.js session bridge; Better Auth remains the auth source of truth.
- Parser support is intentionally limited to the assignment formats and nearby variants.
- DB-backed auth route tests require `DATABASE_URL` to be reachable. They self-skip only in local environments where the disposable Postgres service is not running.
- Deployment is not included in this local package, but the app is structured for Vercel frontend plus Railway/Render/Fly/Neon/Supabase Postgres backend/database.

## AI Tools Used

ChatGPT/Codex was used for PRD synthesis, implementation, debugging, and documentation drafting. The final code and architectural choices should be reviewed and explainable during the assignment walkthrough.
