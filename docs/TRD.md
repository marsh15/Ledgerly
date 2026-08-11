# 02 — Technical Requirements Document: Ledgerly

## Purpose

Ledgerly is a multi-tenant personal-finance web application that converts raw bank text into structured, reviewable transactions and can export filtered records as CSV. This document fixes the technical boundaries for implementation and maintenance.

## System Architecture

```text
Browser
  -> Next.js frontend (Auth.js session bridge)
  -> Hono HTTP API
  -> Better Auth identity and tenant context
  -> domain services (parsing, analytics, subscriptions, insights)
  -> Prisma
  -> PostgreSQL with row-level security
```

The Hono API is the authorization boundary. It derives `userId`, `organizationId`, and `teamId` from the verified session; client-provided ownership identifiers are never trusted.

## Frontend

- Next.js 16 App Router, React 19, and TypeScript.
- React Server Components by default; client components only for interactive application state.
- Tailwind CSS with local shadcn/ui-style primitives.
- TanStack Query for server-state reads, mutations, cache invalidation, and optimistic updates.
- Recharts for analytics visualizations.
- Auth.js credentials provider as a frontend session bridge around the backend-issued Better Auth token.

## Backend

- Node.js runtime with Hono and TypeScript.
- REST-style JSON endpoints under `/api`.
- Zod schemas in `packages/shared` define request contracts and validation.
- Deterministic parsing remains in shared code; OpenAI is used only for optional aggregate insights.
- Structured errors use `error.code` and `error.message`.
- Login, parsing, and AI endpoints use bounded process-local rate limits. A shared store is a release requirement before multi-instance deployment.

## Data and Authentication

- PostgreSQL is the primary database.
- Prisma is the application ORM and migration layer.
- `DATABASE_URL` uses a non-owner runtime role so row-level security is enforced.
- `DATABASE_MIGRATION_URL` uses the owner/migrator role.
- Better Auth owns accounts, password hashes, sessions, bearer/JWT issuance, organizations, teams, and membership.
- Sessions expire after seven days.
- Each new user receives a personal organization and team before entering the application.

## Deployment

- Frontend target: Vercel.
- Backend target: Render as a long-running Node.js service.
- Database target: managed PostgreSQL.
- Rate limiting: process-local for the current single-instance deployment; use a managed shared store before horizontal scaling.
- Deployments expose `/health` for liveness and `/ready` for database readiness.

## Repository Structure

```text
apps/frontend/        Next.js routes, components, session bridge, API client
apps/backend/         Hono routes, domain services, Prisma schema and SQL policies
packages/shared/      Zod contracts, deterministic parser, shared tests
docs/                 product and engineering source-of-truth documents
tests/                Playwright end-to-end tests
```

Use kebab-case for new source filenames, PascalCase for React component names, camelCase for TypeScript values, and Prisma's existing model conventions for database entities.

## Environment Variables

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `FRONTEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `BACKEND_INTERNAL_URL`
- `AI_INSIGHTS_ENABLED`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Secrets must remain server-side. Only variables explicitly prefixed with `NEXT_PUBLIC_` may enter the browser bundle.

## Quality Requirements

- TypeScript compilation must pass across all workspaces.
- Jest covers parsers, contracts, auth behavior, tenant isolation, analytics, subscriptions, rate limits, and security routes.
- Playwright is the browser-level verification layer for public/auth surfaces and, with PostgreSQL available, registration, isolation, import, and transaction flows.
- Money is stored as decimal values and never aggregated across different currency codes.
- Cursor pagination is ordered by `createdAt desc, id desc` and uses opaque cursors.
- AI requests contain aggregates and subscription candidates only—never raw transaction text, identity, or account data.
- Logs may contain request IDs and security hashes, but not passwords, auth tokens, raw finance text, or provider secrets.

## Technical Constraints

- No client-side authorization decisions may substitute for backend tenant scoping.
- No LLM-based transaction extraction in v1.
- No bank account linking, OCR, or uploaded statement storage.
- Raw input is sensitive and must not be sent to third-party AI providers.
- Production proxy headers may be trusted only when the proxy is configured to replace, not append, forwarded client IP values.
