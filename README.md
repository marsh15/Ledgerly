# Ledgerly

Ledgerly is a secure personal finance transaction extraction app built as a fullstack assignment. Authenticated users can paste raw bank transaction text, extract structured data, save it to PostgreSQL, and view only their own tenant-scoped transactions.

The final source-of-truth PRD lives in [docs/PRD.md](docs/PRD.md).

## Tech Stack

- Backend: Hono + TypeScript
- Auth: Better Auth email/password, seven-day sessions, bearer/JWT plugins, organization/team plugin
- Database: PostgreSQL + Prisma
- Frontend: Next.js 15 App Router + TypeScript + Server Components
- Frontend session bridge: Auth.js credentials provider stores the Better Auth bearer token in the Auth.js JWT session
- UI: Tailwind CSS + shadcn/ui-style primitives
- Tests: Jest + ts-jest

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
npm run seed
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
DATABASE_URL="postgresql://ledgerly:ledgerly@localhost:5432/ledgerly?schema=public"
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

## Commands

```bash
npm test
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:push
npm run seed
```

Use `prisma:migrate` for normal local setup. `prisma:push` is available for quick disposable databases.

## Demo Users

After `npm run seed`:

- `asha@example.com` / `Password123!`
- `rohan@example.com` / `Password123!`

Each seeded user gets a separate personal organization and team.

## API

```http
POST /api/auth/register
POST /api/auth/login
POST /api/transactions/extract
GET /api/transactions?limit=10&cursor=<id>
```

`POST /api/transactions/extract` accepts:

```json
{ "text": "raw bank transaction text..." }
```

Successful extraction returns:

```json
{
  "transaction": {
    "id": "transaction_id",
    "date": "2025-12-11",
    "description": "STARBUCKS COFFEE MUMBAI",
    "amount": -420,
    "type": "DEBIT",
    "balanceAfter": 18420.5,
    "category": null,
    "confidence": 0.95,
    "createdAt": "2025-12-11T10:00:00.000Z"
  }
}
```

Transaction listing returns `items` and `nextCursor`. A temporary `transactions` alias is also returned for frontend compatibility.

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

Transactions are sorted by `createdAt desc, id desc`. The backend fetches `limit + 1` rows, returns the requested page, and returns the last item ID as `nextCursor` when another page exists.

Prisma indexes support tenant-scoped listing and date lookup:

- `userId + createdAt`
- `organizationId + createdAt`
- `userId + date`
- `organizationId + date`

## Optional Postgres RLS

The application enforces isolation in backend queries. An optional PostgreSQL RLS helper is included at `apps/backend/prisma/rls.sql`:

```bash
psql "$DATABASE_URL" -f apps/backend/prisma/rls.sql
```

## Demo Checklist

1. Register User A.
2. Paste and save all three sample transactions.
3. Show the transaction table with date, description, amount, type, balance, category, and confidence.
4. Log out.
5. Register or log in as User B.
6. Show User B cannot see User A's transactions.
7. Explain that Better Auth owns auth and tenant membership.
8. Explain that backend transaction queries derive ownership from the verified session.
9. Explain deterministic parser logic, MM/DD slash dates, confidence scoring, pagination, and indexes.
10. Run `npm test` and show the passing parser/isolation tests.

## Known Trade-Offs

- Auth.js is used only as a Next.js session bridge; Better Auth remains the auth source of truth.
- Parser support is intentionally limited to the assignment formats and nearby variants.
- The current tests cover parser behavior and tenant filter construction. Stronger follow-up coverage would add route-level tests against a disposable database.
- Deployment is not included in this local package, but the app is structured for Vercel frontend plus Railway/Render/Fly/Neon/Supabase Postgres backend/database.

## AI Tools Used

ChatGPT/Codex was used for PRD synthesis, implementation, debugging, and documentation drafting. The final code and architectural choices should be reviewed and explainable during the assignment walkthrough.
