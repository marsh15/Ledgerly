# 03 — App Flow: Ledgerly

## Route Map

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page; authenticated users may continue to the app. |
| `/login` | Public-only | Email/password login and recovery from authentication errors. |
| `/register` | Public-only | Create an account and personal tenant. |
| `/overview` | Protected | Dashboard totals, trends, category/merchant breakdowns, subscriptions, and AI insights. |
| `/transactions` | Protected | Search, filter, paginate, delete, and export transactions. |
| `/import` | Protected | Preview raw text, correct drafts, detect duplicates, and save transactions. |
| `/rules` | Protected | Create and delete merchant-to-category rules. |

## Navigation

Desktop uses a compact horizontal application navigation for Overview, Transactions, Import, and Rules, plus account/logout actions. On narrow screens the navigation remains scrollable without hiding destinations. The active route is visually and programmatically identifiable.

Logged-out visitors begin at `/`. Logged-in users entering an auth route are sent to `/overview`. Logged-out users entering any protected route are sent to `/login`, with the intended destination preserved where practical.

## Authentication Flow

1. Visitor selects **Create account** and opens `/register`.
2. They submit name, email, and password.
3. The backend creates the Better Auth identity, personal organization, team, and session.
4. Auth.js stores the backend token in its server-managed session bridge.
5. The user is redirected to `/overview` and sees an empty-state dashboard.

Login follows the same session-bridge path without account creation. Logout revokes the backend session, clears the frontend session, and returns the user to `/login`.

## Journey 1: Import Raw Transaction Text

1. User opens `/import` and selects text input.
2. User pastes one or more bank transaction snippets and optionally sets an account label.
3. **Preview** sends raw text to the protected parser endpoint without saving.
4. Draft cards show extracted fields, confidence, validation issues, and duplicate warnings.
5. The user corrects incomplete fields and selects drafts to save.
6. **Save transactions** persists the selected drafts with server-derived tenant ownership.
7. Success links to `/transactions`; affected transaction and analytics queries are refreshed.

Invalid drafts remain blocked until required fields are corrected. The parser never silently substitutes today's date, zero amounts, or inferred ownership.

## Journey 2: Create a Category Rule

1. User opens `/rules` and enters a case-insensitive merchant phrase and category.
2. The backend upserts the mapping inside the authenticated tenant.
3. Future previews apply the tenant rule before built-in categorization.
4. User may delete the rule without rewriting previously saved transactions.

## Journey 3: Review and Understand Spending

1. User opens `/overview`.
2. Currency-specific totals and monthly trends load for the active filters.
3. User inspects category, merchant, review, duplicate, and recurring-charge sections.
4. If AI is configured and enough data exists, the user requests aggregate-only insights.
5. A chart or summary action can take the user to `/transactions` with related filters.

## Journey 4: Maintain Transactions and Rules

1. User opens `/transactions` and searches or filters the ledger.
2. The responsive list shows essential amount, currency, type, date, status, balance, account, and confidence data.
3. User may delete a transaction or export the filtered view as CSV.
4. From `/rules`, the user creates a case-normalized merchant match rule for future previews.

## Interface States

### Empty

- Overview: zero-valued summary cards and a clear **Import transactions** action.
- Transactions: explain that no records match; distinguish an empty account from empty filters.
- Rules: explain category automation and offer **Create rule**.
- Insights: distinguish `empty`, `not_enough_data`, `disabled`, and `missing_api_key` states.

### Loading

- Route-level skeletons preserve page layout.
- Buttons show an in-place pending label and prevent duplicate submission.
- Background query refresh keeps existing data visible when safe.
- Raw-text preview indicates progress and prevents duplicate submissions.

### Error

- Field validation appears next to the relevant input.
- API errors show a plain-language message plus retry when the action is safe to repeat.
- Session expiry redirects to `/login` without exposing protected content.
- Global route failures use the application error boundary and a recovery action.

## Modals and Overlays

- Destructive actions use explicit labels and announce their result.
- Mobile transactions use stacked cards; desktop uses a semantic table.

## Redirect Rules

- Successful registration or login -> `/overview` (or a validated protected callback URL).
- Successful logout -> `/login`.
- Unauthenticated protected request -> `401`; protected page -> `/login`.
- Authenticated visit to `/login` or `/register` -> `/overview`.
- Successful save -> remain on the confirmation state with actions for `/transactions` and another preview.
- Unknown application route -> framework not-found experience with a route back to `/overview` or `/`.
