# 05 — Backend Schema: Ledgerly

## Ownership Model

Ledgerly is tenant-scoped by organization and additionally records the acting user and optional team. Every protected request resolves scope from Better Auth before querying. PostgreSQL row-level security provides a second enforcement layer through transaction-local tenant context.

```text
User -> Member -> Organization -> Team
  |                    |
  +-> Transaction <----+
  +-> ImportBatch <-----+
  +-> CategoryRule <----+
```

## Authentication Tables

Better Auth owns `User`, `Session`, `Account`, `Verification`, `Jwks`, `Organization`, `Member`, `Invitation`, `Team`, and `TeamMember`.

Key rules:

- `User.email` is unique.
- `Session.token` is unique and sessions reference one user.
- `Member` is unique by `(organizationId, userId)`.
- `TeamMember` is unique by `(teamId, userId)`.
- Organizations and teams cascade-delete their membership records.
- Password hashes and provider tokens remain in Better Auth's `Account` model and are never returned by application APIs.

## Application Tables

### `Transaction`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string/cuid | Primary key. |
| `userId` | string | FK to `User`; server-derived owner. |
| `organizationId` | string | FK to `Organization`; required tenant key. |
| `teamId` | string, nullable | Active team at creation time. |
| `date` | timestamp | Normalized transaction date at UTC midnight. |
| `description` | string | Human-readable merchant/description. |
| `type` | enum | `DEBIT` or `CREDIT`. |
| `amount` | decimal(12,2) | Signed, decimal-safe amount. |
| `currencyCode` | string | ISO-style code, default `INR`. |
| `balanceAfter` | decimal(12,2), nullable | Balance stated by the source. |
| `category` | string, nullable | Built-in, rule-derived, or user-edited category. |
| `confidence` | float | Deterministic parser completeness score. |
| `status` | enum | `SAVED` or `NEEDS_REVIEW`. |
| `accountLabel` | string | User-facing account grouping; default `Personal`. |
| `duplicateOfId` | string, nullable | Self-reference to an existing tenant-local transaction. |
| `importBatchId` | string, nullable | FK to the originating import batch. |
| `source` | enum | `TEXT`, `CSV`, or `MANUAL`. |
| `rawText` | string | Original source retained for user review; sensitive. |
| `createdAt` / `updatedAt` | timestamp | Audit timestamps. |

Important indexes cover tenant pagination, date filters, status, category, account, import batch, and duplicate relationships. Pagination uses `(organizationId, createdAt, id)` or the stricter user-and-organization equivalent.

### `ImportBatch`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string/cuid | Primary key. |
| `userId` | string | FK to importing user. |
| `organizationId` | string | Required tenant key. |
| `filename` | string | Display/audit name; file contents are not stored as an upload. |
| `totalRows` | integer | Rows parsed from the input. |
| `importedRows` | integer | Rows persisted. |
| `skippedRows` | integer | Invalid, excluded, or duplicate rows. |
| `createdAt` | timestamp | Import time. |

An import batch has many transactions. Deleting a batch through the rollback workflow removes only tenant-scoped imported transactions.

### `CategoryRule`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string/cuid | Primary key. |
| `userId` | string | FK to creating user. |
| `organizationId` | string | Required tenant key. |
| `matchText` | string | Normalized case-insensitive merchant fragment. |
| `category` | string | Category applied to future previews. |
| `createdAt` / `updatedAt` | timestamp | Audit timestamps. |

`(organizationId, matchText)` is unique so a tenant cannot create ambiguous duplicate rules.

### `AuditEvent`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string/cuid | Primary key. |
| `actorId` | string | Authenticated user identifier. |
| `organizationId` | string | Tenant key. |
| `action` | string | Stable event name. |
| `resourceType` | string | Affected entity type. |
| `resourceId` | string, nullable | Affected entity identifier. |
| `requestId` | string | Correlates event with request logs. |
| `metadata` | JSON | Minimal non-secret event context. |
| `createdAt` | timestamp | Event time. |

Audit metadata must not contain tokens, passwords, raw transaction text, or provider secrets.

## Access Rules

- A user may read and mutate transactions only when both authenticated scope and row ownership match.
- Organization membership is verified before an active organization or team is accepted.
- Request bodies cannot select `userId`, `organizationId`, or `teamId`.
- Duplicate targets, import batches, and category rules must be resolved within the same tenant.
- Analytics, exports, subscriptions, and AI inputs are derived only from tenant-scoped queries.
- New accounts contain no transactions unless the account is an explicit seeded demo user.
- The database runtime role cannot bypass row-level security; migrations use a separate owner role.

## Sensitive Data and Retention

- `Account.password`, session tokens, signing keys, and provider tokens are authentication secrets.
- `Transaction.rawText`, descriptions, balances, and amounts are sensitive financial data.
- Sensitive values are stored only in PostgreSQL and transmitted over TLS in production.
- No uploaded CSV file or media object is retained; only validated rows and batch metadata are stored.
- OpenAI receives currency-separated aggregates and recurring candidates only.
- Application logs and audit events use identifiers/hashes and exclude raw financial inputs.

## API Surface

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Transactions and Imports

- `POST /api/transactions/preview`
- `POST /api/transactions`
- `POST /api/transactions/extract`
- `GET /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/export`
- `POST /api/imports/preview`
- `POST /api/imports`
- `GET /api/imports`
- `DELETE /api/imports/:id`

### Rules and Analysis

- `GET|POST /api/category-rules`
- `PATCH|DELETE /api/category-rules/:id`
- `GET /api/analytics/summary`
- `GET /api/analytics/subscriptions`
- `POST /api/insights/generate`

### Operations

- `GET /health`
- `GET /ready`
