# Ledgerly

Ledgerly is a personal finance transaction management app for turning raw bank transaction text into structured, reviewable records. Authenticated users can preview parsed transactions, save reviewed drafts, manage category rules, export CSVs, and access only their own tenant-scoped data.

## Live Demo

- Frontend: https://ledgerly-demo.vercel.app/
- Backend: https://ledgerly-ytqk.onrender.com

## Tech Stack

- Frontend: Next.js 15 App Router, TypeScript, React Server Components
- Backend: Hono, TypeScript
- Authentication: Better Auth with email/password sessions, bearer/JWT plugins, and organization/team support
- Frontend session bridge: Auth.js credentials provider
- Database: PostgreSQL with Prisma
- UI: Tailwind CSS and shadcn/ui-style primitives
- Testing: Jest, ts-jest, Playwright

## Architecture

```text
Next.js frontend
  -> Auth.js credentials session bridge
  -> Hono backend
  -> Better Auth identity and tenant context
  -> Transaction parser and tenant-scoped services
  -> Prisma
  -> PostgreSQL
```

Better Auth is the source of truth for registration, login, password hashing, sessions, tokens, and organization/team membership. Auth.js is used only as the Next.js session bridge for pages and client components.

## Features

- Email/password registration and login
- Raw bank transaction parsing
- Preview-before-save workflow for parsed drafts
- Bulk transaction saving
- Duplicate detection within the authenticated tenant
- Category rules for merchant-specific categorization
- Search, filtering, cursor pagination, and CSV export
- Tenant-scoped backend queries and PostgreSQL row-level security

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Run the backend and frontend in separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open `http://localhost:3000`.

## Environment

`.env.example` contains the required local variables:

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

`FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_URL` are kept for compatibility. `FRONTEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are the primary frontend/backend URL variables.

## Commands

```bash
npm test
npm run test:e2e
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:push
npm run seed
```

Use `prisma:migrate` for normal local setup. `prisma:push` is available for disposable databases.

## Demo Users

After running `npm run seed`, the following users are available locally:

- `asha@example.com` / `Password123!`
- `rohan@example.com` / `Password123!`

Each seeded user belongs to a separate personal organization and team.

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

All transaction and category-rule endpoints are protected. The backend derives `userId`, `organizationId`, and `teamId` from the verified Better Auth session. Client-supplied ownership fields are ignored.

### Preview Transactions

`POST /api/transactions/preview` accepts raw text and returns editable drafts without saving:

```json
{
  "text": "raw bank transaction text...",
  "accountLabel": "Personal"
}
```

The parser supports multiple transactions separated by blank lines. Each draft includes `draftId`, `sourceText`, `status`, `accountLabel`, and duplicate metadata.

### Save Drafts

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

### Single-Step Extraction

`POST /api/transactions/extract` parses and saves a single transaction:

```json
{
  "text": "raw bank transaction text...",
  "accountLabel": "Personal"
}
```

Successful responses include the saved transaction and duplicate metadata.

### Listing And Export

Transaction listing returns `items`, `nextCursor`, and a temporary `transactions` alias for frontend compatibility. `nextCursor` is an opaque cursor based on `createdAt + id`.

Supported filters:

- `search`
- `dateFrom`
- `dateTo`
- `type=DEBIT|CREDIT`
- `category`
- `status=SAVED|NEEDS_REVIEW`
- `accountLabel`
- `minConfidence`

`GET /api/transactions/export` accepts the same filters and returns up to 1,000 tenant-scoped rows as CSV. CSV columns are `date`, `description`, `amount`, `type`, `balanceAfter`, `category`, `confidence`, `status`, `accountLabel`, and `createdAt`.

## Parser Behavior

The parser is deterministic and does not use an LLM.

Supported date formats:

- `11 Dec 2025`
- `12/11/2025`
- `2025-12-10`

Slash dates are interpreted as `MM/DD/YYYY`, so `12/11/2025` becomes `2025-12-11`.

Supported amount and debit indicators:

- `-420.00`
- `₹1,250.00 debited`
- `₹2,999.00 Dr`
- `->` and `→` balance arrows

Confidence is calculated from detected fields:

- Date found: `+0.25`
- Amount found: `+0.25`
- Description found: `+0.20`
- Debit/credit type found: `+0.15`
- Balance found: `+0.10`
- Category found: `+0.05`

Drafts with confidence below `0.85` are marked `NEEDS_REVIEW`; higher-confidence drafts are marked `SAVED`.

## Security And Data Isolation

Protected transaction routes verify the incoming cookie or bearer token with Better Auth, resolve the authenticated user's active organization/team membership, and build Prisma filters from server-side auth context.

Transaction reads and writes are scoped by both:

- authenticated `userId`
- authenticated `organizationId`

The backend does not trust `userId`, `organizationId`, `teamId`, or `duplicateOfId` from client input unless the referenced data is verified to belong to the authenticated tenant.

PostgreSQL row-level security is enabled and forced on `transaction` and `category_rule`. Tenant-scoped Prisma operations run inside a transaction that sets `app.current_organization_id` before touching those tables.

For databases created before the RLS migration, the policy SQL is available at `apps/backend/prisma/rls.sql`:

```bash
psql "$DATABASE_URL" -f apps/backend/prisma/rls.sql
```

## Pagination And Indexes

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

## Category Rules

Category rules are tenant-scoped phrase-to-category mappings. They are applied before explicit parsed categories and built-in categories:

```json
{
  "matchText": "starbucks",
  "category": "Client Meals"
}
```

`POST /api/category-rules` upserts by `organizationId + matchText`. `PATCH /api/category-rules/:id` and `DELETE /api/category-rules/:id` require the rule to belong to the authenticated tenant.

## Error Format

Error responses use a consistent shape:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## Known Trade-Offs

- Auth.js is used only as a Next.js session bridge; Better Auth remains the auth source of truth.
- Parser support is intentionally focused on common bank transaction text formats and nearby variants.
- Database-backed auth route tests require `DATABASE_URL` to be reachable.
