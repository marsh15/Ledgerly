# Ledgerly Architecture Map

```text
Browser / Next.js pages
  -> Auth.js credentials bridge
  -> Better Auth-backed Hono API
  -> authenticated TenantScope { userId, organizationId, teamId }
  -> shared validation / parser / business services
  -> Prisma transaction with tenant context
  -> PostgreSQL tables + row-level security
  -> presented JSON / CSV response
  -> TanStack Query cache and UI
```

The central interview theme is that the browser is a client, not a security boundary. Ownership is derived on the backend from verified authentication and then repeated in database policy checks.

## Major communities

1. Frontend routes and ledger UI
2. Backend API, authentication, tenant scope, and database access
3. Shared contracts, CSV normalization, and deterministic extraction
4. Analytics, recurring subscription detection, and aggregate-only AI insights
5. Prisma schema, migrations, and PostgreSQL row-level security
6. Unit, integration, and Playwright end-to-end tests
