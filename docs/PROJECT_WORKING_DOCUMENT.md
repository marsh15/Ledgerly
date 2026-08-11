# Ledgerly Project Working Document

## 1. Project Overview

Ledgerly is a personal finance transaction management application. Its main purpose is to help users convert messy financial information into a clean, searchable ledger.

People often receive transaction information through bank SMS messages, emails, account statements, or CSV exports. That information is usually inconsistent: dates may appear in different formats, amounts may include symbols or commas, descriptions may be noisy, and some transactions may need manual review. Ledgerly gives users a private workspace where they can import or enter that financial data, review it, categorize it, analyze it, and export it again.

The project is built around one central promise: every user's financial data must stay private. The system does not rely on the frontend to decide ownership. Instead, the backend and database derive ownership from the authenticated session and enforce tenant isolation whenever data is read, written, updated, deleted, analyzed, imported, exported, or sent for AI-generated insights.

## 2. Main Problem The Project Solves

The project solves three connected problems.

First, raw transaction data is inconvenient. A bank message or CSV file may contain useful financial information, but the user still needs a structured record with a date, description, amount, type, currency, category, status, and account label.

Second, personal finance data is sensitive. A finance app must make sure that one user cannot view or manipulate another user's data, even if they change request payloads, URLs, or browser state.

Third, financial review becomes easier when the app can summarize the ledger. Once transactions are structured, Ledgerly can show spending, income, categories, recurring charges, duplicates, and review counts.

## 3. High-Level Architecture

Ledgerly is organized as a monorepo with three main areas.

The frontend is a Next.js application. It provides the user interface for login, registration, overview, transactions, CSV import, and category rules.

The backend is a TypeScript API service using Hono. It handles authentication forwarding, protected routes, transaction operations, import operations, analytics, subscription detection, AI insights, rate limiting, and database access.

The shared package contains common business rules used by both sides of the app. It defines transaction contracts, validation rules, CSV normalization, and text extraction logic.

The project uses PostgreSQL as its database, Prisma as the database access layer, Better Auth as the main identity and session system, Auth.js as the frontend session bridge, TanStack Query for frontend server state, and Recharts for dashboard charts.

Conceptually, the request path looks like this:

Frontend screen -> Auth.js session -> Hono backend -> Better Auth tenant context -> Prisma transaction -> PostgreSQL row-level security -> response back to the frontend.

## 4. User Journey

A typical user journey starts with registration or login.

When a new user registers, Ledgerly creates an account and provisions a personal workspace. That workspace is represented by an organization and a personal team. The user starts with an empty ledger, so seeded demo data does not appear in real user accounts.

After signing in, the user lands in the protected ledger area. From there, they can open the overview, transaction list, import workflow, or category rules page.

The user can add transactions manually, import a CSV file, or paste raw transaction text for extraction through the backend API. Ledgerly normalizes that data into a consistent transaction shape.

After transactions are saved, the overview page summarizes the ledger. It shows totals by currency, cash-flow trends, review counts, possible duplicates, and recurring charge candidates.

The transaction page lets the user search, filter, edit, delete, and paginate through ledger entries.

The import page supports a staged workflow: choose a CSV, map columns, normalize rows, preview duplicates, import selected rows, and roll back an import batch if needed.

The rules page lets the user define merchant or description matching rules so future transactions can be categorized automatically.

## 5. Authentication Model

Ledgerly uses Better Auth as the source of truth for identity. Better Auth owns registration, login, password hashing, sessions, bearer tokens, JWT support, organizations, and teams.

The frontend uses Auth.js as a bridge. This means the Next.js app keeps a frontend-friendly session, but it does not replace the backend authentication system. During login or registration, the frontend sends credentials to the backend. The backend talks to Better Auth, receives a verified identity and token, and returns session information to the frontend.

Once authenticated, frontend API calls include the backend token. Protected backend routes read that token, ask Better Auth for the current session, and derive the user's tenant scope from that session.

This separation matters because the frontend is not treated as the security authority. The browser can display forms and send requests, but the backend decides who the user is and which workspace they are allowed to access.

## 6. Tenant And Workspace Model

Ledgerly is tenant-scoped. A tenant is the private workspace that contains a user's transactions, imports, and category rules.

Each registered user gets a personal organization. That organization acts as the boundary around the user's financial data. A personal team can also exist inside that organization.

When a protected request arrives, the backend determines three important values:

- the authenticated user identity
- the active organization
- the active team, when applicable

Those values become the tenant scope for the request.

The backend does not trust ownership values sent by the client. Even if a request includes another user ID or organization ID, the backend ignores that ownership input and writes records using the authenticated user's scope.

## 7. Database Model

The database stores both authentication data and finance data.

The authentication side includes users, sessions, accounts, organizations, members, teams, team members, invitations, verification records, and signing keys.

The finance side includes transactions, import batches, and category rules.

A transaction is the central business record. It stores the transaction date, description, debit or credit type, amount, currency code, balance after the transaction, category, confidence score, review status, account label, duplicate relationship, source, raw text, owner user, owner organization, optional team, and timestamps.

An import batch stores metadata about a CSV import. It tracks the filename, total rows, imported rows, skipped rows, owner user, owner organization, and creation time. The original CSV file is not stored.

A category rule stores a piece of text to match and the category that should be assigned when that text appears in a transaction description.

The data model is designed to support ownership filtering, search, pagination, import rollback, duplicate detection, analytics, and review workflows.

## 8. Row-Level Security Concept

Ledgerly uses PostgreSQL row-level security for critical tenant-owned tables.

Row-level security is a database-level protection mechanism. Instead of relying only on application queries to include the correct filters, the database itself checks whether a row belongs to the current user and organization.

For tenant-owned tables such as transactions, category rules, and import batches, the database policies require the row's user and organization to match the current request's tenant context.

The backend sets this tenant context inside a database transaction before doing tenant-owned work. That gives the project two layers of protection:

- The application builds queries using the authenticated user's tenant scope.
- The database enforces the same tenant scope at the row level.

This is important for sensitive data because it reduces the risk that a missing filter in one query accidentally exposes another user's financial records.

## 9. Transaction Extraction

Ledgerly includes a deterministic transaction extractor. Deterministic means it follows explicit rules rather than asking an AI model to interpret raw transaction text.

The extractor tries to identify key fields:

- date
- amount
- currency
- debit or credit type
- balance after transaction
- description
- category

It understands several common date formats, including named dates, numeric dates, and ISO-style dates. It interprets ambiguous slash dates according to the project's defined parser behavior.

It recognizes amounts with symbols such as rupees and dollars, as well as labels like amount, debit, credit, balance, and available balance.

It infers whether a transaction is a debit or credit from signs, keywords, and amount direction. Debit amounts are stored as negative values, and credit amounts are stored as positive values.

It also calculates a confidence score. The score increases when important fields are found. If confidence is low, the transaction is marked as needing review. This allows Ledgerly to save structured results while still guiding the user toward entries that may need correction.

## 10. Preview-Before-Save Workflow

For pasted transaction text, Ledgerly supports a preview workflow.

The user submits raw text. The backend parses it into one or more drafts. Each draft includes normalized transaction fields, a confidence score, a review status, an account label, and duplicate information.

The draft is not automatically trusted as final. It can be reviewed by the user before saving. When saved, the backend creates real transaction records using the authenticated tenant scope.

This design separates extraction from persistence. The user can inspect the result before it becomes part of the ledger.

## 11. CSV Import Workflow

CSV import is handled as a guided, multi-step process.

First, the user selects a CSV file in the browser. The app reads the file locally and checks basic limits, such as file size, file type, and row count.

Second, Ledgerly detects or asks for column mappings. The user maps CSV columns to transaction concepts such as date, description, amount, type, currency, category, and account.

Third, the frontend normalizes CSV rows into transaction-shaped records. This includes date conversion, amount direction, currency cleanup, category handling, and account labeling.

Fourth, the backend previews the normalized rows. It checks for duplicates against existing transactions and duplicates within the same file. Duplicate rows are skipped by default, but the user can choose which rows to include.

Fifth, the backend creates an import batch and saves selected rows as transactions. Each saved row is associated with that import batch.

Finally, import history allows rollback. Rolling back an import removes the transactions created by that batch and deletes the batch record.

This staged approach reduces accidental imports and gives the user a chance to catch mapping mistakes before data is saved.

## 12. Duplicate Detection

Ledgerly tries to detect duplicate transactions so users do not accidentally import the same record multiple times.

The system compares transaction-like features such as date, amount, currency, account label, and normalized description. It also checks for duplicates within a CSV file during import preview.

When a duplicate is found, the app can mark the new transaction as related to an existing one or skip it during import. This helps keep the ledger clean without requiring the user to manually inspect every repeated row.

## 13. Category Rules

Category rules let users automate categorization.

A rule contains matching text and a category. When future transaction descriptions contain that text, Ledgerly can assign the matching category automatically.

For example, a recurring merchant name can be mapped to Dining, Shopping, Transport, Utilities, or another user-defined category.

The rules are tenant-scoped. A user's rules only affect that user's workspace.

## 14. Transaction Management

The transactions screen is the main ledger management area.

Users can view their saved entries, search descriptions, filter by date, type, status, currency, and other fields, add new transactions, edit existing transactions, delete entries, and load more results through cursor pagination.

Cursor pagination keeps large ledgers responsive. Instead of asking for every transaction at once, the frontend requests a page of records and receives a cursor for the next page. The cursor is tied to ordering by creation time and ID, which makes paging stable even when many records exist.

Edits include a concurrency check. The frontend sends the timestamp of the version the user edited. If the record changed after the user opened it, the backend can reject the update and ask the user to refresh. This prevents silent overwrites.

## 15. Analytics

Ledgerly turns transactions into useful summaries.

The analytics summary groups transactions by currency. This is important because different currencies should not be added together as if they were the same money. For each currency, the app calculates spend, income, net amount, debit count, credit count, monthly series, and category totals.

The overview page uses these analytics to show balances by currency, monthly cash flow, review counts, duplicate counts, and total ledger entries.

Analytics use the same tenant scope and filters as transaction listing. This means a user's dashboard is calculated only from that user's own records.

## 16. Subscription Detection

Ledgerly computes recurring charge candidates from existing transactions.

The system looks at debit transactions, groups similar merchant descriptions and amount bands, and checks whether the dates form a recurring pattern. It can infer weekly, monthly, or quarterly cadence when enough matching transactions exist.

A candidate includes merchant name, average amount, currency, cadence, last charge date, confidence, and transaction count.

Subscriptions are not stored as separate permanent records in this version. They are computed from the ledger when requested. This keeps the feature lightweight and avoids another source of truth.

## 17. AI Insights

Ledgerly can optionally generate AI-powered spending insights.

This feature is backend-only. The frontend never calls OpenAI directly. The backend first calculates aggregate analytics and recurring candidates, then sends only those aggregate summaries to the AI provider.

The AI provider does not receive raw transaction text, SMS content, account numbers, user identity, or another user's data.

The feature is also environment-controlled. If AI insights are disabled or no API key is configured, the backend returns a safe status instead of failing the whole dashboard.

The AI response is constrained to structured insight cards with a title, summary, severity, and metric. The backend validates the response before returning it to the frontend.

## 18. Rate Limiting And Safety

Several sensitive or potentially expensive operations are rate-limited. This includes transaction extraction, saving workflows, imports, and AI insight generation.

Rate limiting protects the backend from accidental repeated submissions, abusive traffic, and runaway AI usage.

The backend also returns structured errors. Instead of exposing raw internal failures, API errors include a stable error code and a readable message.

## 19. Frontend State Management

The frontend uses TanStack Query to manage server state.

Server state includes transactions, analytics, imports, category rules, and subscriptions. TanStack Query gives the app loading states, error states, caching, pagination, and automatic refresh after mutations.

When the user creates, edits, deletes, imports, rolls back, or changes rules, the frontend invalidates the relevant ledger queries. This tells the app to refetch fresh data so the UI stays aligned with the backend.

## 20. Main Screens

The login and registration screens collect credentials and start a protected session.

The overview screen summarizes the ledger with currency totals, monthly cash flow, review counts, duplicate counts, ledger count, and recurring charge candidates.

The transactions screen provides search, filters, manual add, edit, delete, review status display, responsive tables, mobile cards, and load-more pagination.

The import screen handles CSV upload, column mapping, date-format disambiguation, duplicate preview, selected-row import, import history, and rollback.

The rules screen lets users create and delete category rules for automatic categorization.

## 21. Shared Contracts And Validation

The shared package defines the shape of valid transaction inputs, updates, filters, imports, presented transactions, analytics responses, and structured errors.

This matters because frontend and backend both need a common understanding of what a transaction is. Dates must be valid calendar dates, currency codes must be three-letter codes, debit amounts must be negative, credit amounts must be positive, and review statuses must come from a known set.

Using shared validation reduces mismatch between what the frontend sends and what the backend accepts.

## 22. Testing Strategy

The project includes unit, integration, and end-to-end testing.

Parser tests check that raw text is extracted into the expected date, description, amount, type, balance, category, and confidence.

Contract and CSV tests check validation, CSV parsing, date handling, and normalization behavior.

Backend tests check registration, login, protected routes, tenant-scoped transactions, ownership tampering resistance, analytics, subscriptions, and duplicate ownership behavior.

End-to-end tests use the browser to verify real user flows, such as account switching, CSV import, rollback, mobile navigation, and isolation between users.

The testing approach focuses on externally visible behavior. The important question is not just whether functions run, but whether users can safely register, manage private data, import transactions, and avoid leaking data between accounts.

## 23. Deployment Concept

Ledgerly is designed as two deployable applications: a frontend and a backend.

The frontend needs to know the public backend URL so browser requests can reach the API.

The backend needs database connection information, authentication secrets, allowed frontend origins, and optional AI configuration.

Database migrations are managed through Prisma. A separate migration connection can be used for schema changes, while the runtime connection can use a less privileged database role so row-level security is actually exercised.

## 24. Core Design Principles

Ledgerly follows several important design principles.

Security is server-owned. The frontend can request actions, but the backend derives identity and ownership.

Tenant isolation is layered. The application filters by tenant, and PostgreSQL row-level security enforces tenant access at the database level.

Extraction is explainable. Transaction parsing uses deterministic rules and confidence scoring instead of opaque AI extraction.

Imports are staged. Users preview and select rows before they enter the ledger.

Money is currency-aware. Analytics avoid combining different currencies into misleading totals.

AI is aggregate-only. Raw private transaction text is kept away from the AI provider.

Review is part of the workflow. Low-confidence and duplicate-prone records are surfaced so users can correct them.

## 25. End-To-End Mental Model

Ledgerly can be understood as a pipeline.

A user authenticates and enters a private workspace. Raw transaction data enters the system through text, manual entry, or CSV import. Shared validation and parsing logic normalize that raw input into structured transaction records. The backend saves those records only inside the authenticated tenant. PostgreSQL enforces that tenant boundary. The frontend reads the user's own records through protected APIs and presents them as a searchable ledger. Analytics, recurring charge detection, export, category rules, and optional AI insights are all built on top of that same tenant-scoped transaction foundation.

In short, Ledgerly is a secure personal finance ledger that converts messy transaction sources into structured, private, reviewable, and analyzable financial records.
