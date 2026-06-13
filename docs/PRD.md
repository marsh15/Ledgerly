# PRD: Ledgerly

## Problem Statement

Users receive personal finance transactions in messy SMS, email, and statement text. Manually converting those snippets into structured records is slow and error-prone. Because this data is sensitive, the product must prove that authentication, authorization, and tenant isolation are first-class requirements, not frontend conveniences.

The core guarantee is: a user must never be able to access another user's transactions, even if they manipulate requests, query strings, or payload ownership fields.

## Solution

Ledgerly is a secure personal finance web app where authenticated users paste raw transaction text, the system deterministically extracts structured transaction data, saves it to PostgreSQL, and shows only the current user's tenant-scoped transactions in a protected dashboard.

The product stays intentionally small: auth, tenant ownership, deterministic extraction, persistence, cursor pagination, tests, and clear documentation.

## User Stories

1. As a new user, I want to register with email and password, so that I can access a private transaction workspace.
2. As a registered user, I want to sign in securely, so that I can view and add my own transaction data.
3. As a signed-in user, I want my session to last for seven days, so that I do not need to authenticate repeatedly during normal use.
4. As a logged-out visitor, I want to be redirected away from the dashboard, so that private data is not exposed.
5. As an authenticated user, I want to paste raw bank transaction text, so that I can avoid manually entering structured fields.
6. As an authenticated user, I want clear loading, success, and error states, so that I know whether extraction and saving worked.
7. As an authenticated user, I want extracted transactions to save automatically, so that parsing and persistence are one workflow.
8. As an authenticated user, I want to see transaction date, description, amount, type, balance, category, and confidence, so that I can inspect the saved result.
9. As an authenticated user, I want to load more transactions with cursor pagination, so that large histories remain responsive.
10. As User A, I want User B to never see my transactions, so that my finance data stays private.
11. As User B, I should not be able to override `userId` or `organizationId`, so that request tampering cannot bypass isolation.
12. As the backend, I must derive ownership from verified Better Auth context, so that the server remains the security boundary.

## Functional Requirements

### Authentication

The backend supports email/password registration and login through Better Auth. Better Auth owns password hashing, sessions, bearer tokens, and organization/team records. Sessions expire after seven days.

Required endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

Registration creates or associates a personal organization/team for the user. Login ensures a tenant exists before returning frontend session data.

### Transaction Extraction

`POST /api/transactions/extract` is protected. It accepts only raw text:

```json
{ "text": "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50" }
```

The endpoint verifies auth, derives `userId` and `organizationId` server-side, parses the transaction, saves it through Prisma, and returns the saved transaction. It must ignore any client-supplied ownership fields.

Returned transaction fields:

- `id`
- `date`
- `description`
- `amount`
- `type`
- `balanceAfter`
- `category`
- `confidence`
- `createdAt`

### Transaction Listing

`GET /api/transactions?limit=10&cursor=<id>` is protected. It verifies auth, derives tenant scope, queries only matching `userId` and `organizationId`, sorts newest first, returns `items`, and includes `nextCursor` when more rows exist.

## Parser Requirements

The parser is deterministic, explainable, and testable. It supports:

- Dates: `11 Dec 2025`, `12/11/2025`, `2025-12-10`
- Amounts: `-420.00`, `₹1,250.00`, `₹2,999.00`
- Debit indicators: negative amount, `debited`, `debit`, `Dr`
- Balance labels: `Balance after transaction`, `Available Balance`, `Bal`

Slash dates are interpreted as `MM/DD/YYYY`; therefore `12/11/2025` becomes `2025-12-11`.

Confidence is a deterministic completeness score:

- Date found: `+0.25`
- Amount found: `+0.25`
- Description found: `+0.20`
- Debit/credit type found: `+0.15`
- Balance found: `+0.10`
- Category found: `+0.05`

## Required Samples

Sample 1 extracts `2025-12-11`, `STARBUCKS COFFEE MUMBAI`, `-420.00`, `DEBIT`, `18420.50`, `null`, `0.95`.

Sample 2 extracts `2025-12-11`, `Uber Ride * Airport Drop`, `-1250.00`, `DEBIT`, `17170.50`, `null`, `0.95`.

Sample 3 extracts `2025-12-10`, `Amazon.in Order #403-1234567-8901234`, `-2999.00`, `DEBIT`, `14171.50`, `Shopping`, `1.0`.

## Implementation Decisions

- Use Hono for the backend API surface.
- Use Better Auth as the auth source of truth for user identity, password hashing, sessions, bearer tokens, and organization/team membership.
- Use Auth.js in the Next.js frontend as a session bridge around the backend-issued Better Auth bearer token.
- Use Prisma with PostgreSQL for app and Better Auth persistence.
- Store every transaction with `userId`, `organizationId`, optional `teamId`, normalized fields, raw source text, and timestamps.
- Use decimal-safe database types for money values.
- Use cursor pagination ordered by `createdAt desc, id desc`.
- Keep transaction ownership out of client inputs. Ownership is derived only from authenticated backend context.
- Return structured API errors with an `error.code` and `error.message`.

## Testing Decisions

Good tests assert externally visible behavior: extracted fields, confidence, scoped filters, and tampering resistance. Parser tests cover all required samples and incomplete text. Isolation tests verify transaction filters are constructed from authenticated tenant scope rather than caller-provided ownership data.

The minimum acceptance bar is six passing Jest tests; stronger coverage should add protected route, authenticated create, cross-user listing, ownership override, and pagination tests.

## Out Of Scope

The product does not include bank linking, PDF/OCR parsing, LLM extraction, charts, budgets, admin tools, payments, mobile apps, complex RBAC, or manual transaction editing.

## Acceptance Criteria

- Users can register, log in, log out, and access a protected dashboard.
- Logged-out users cannot access the dashboard or protected APIs.
- All three required samples parse accurately.
- Extracted transactions save to PostgreSQL.
- Saved rows include server-derived user and organization ownership.
- Users can list only their own transactions.
- Cursor pagination returns a `nextCursor` when more rows exist.
- Client-supplied ownership fields cannot bypass tenant isolation.
- Jest tests pass.
- README documents setup, env vars, commands, parser assumptions, auth, isolation, pagination, demo credentials, and AI tools used.
