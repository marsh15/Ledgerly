# Graph Report - .  (2026-07-09)

## Corpus Check
- Corpus is ~38,047 words - fits in a single context window. You may not need a graph.

## Summary
- 545 nodes · 856 edges · 36 communities (30 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Ledger UI
- Backend Auth Tenant DB
- Backend API Validation
- Dashboard Transactions UI
- Frontend Package Dependencies
- Analytics AI Insights
- Shared API Contracts
- Transaction Parser Engine
- Root Test Tooling
- Frontend Routes API Client
- Backend Runtime Dependencies
- Shadcn UI Configuration
- Rate Limiting
- Auth Pages Forms
- Base TypeScript Config
- Frontend TypeScript Config
- Shared Package Config
- Shared UI Primitives
- Backend TypeScript Config
- Import Pipeline Docs
- CI Database Setup
- Tenant Isolation Architecture
- App Layout Providers
- Table UI Components
- NextAuth Types
- Package TypeScript Config
- AI Privacy Docs
- Next Config
- Next Env Types
- PostCSS Config
- Analytics Docs
- Auth Route Handlers
- Testing Strategy

## God Nodes (most connected - your core abstractions)
1. `extractTransaction()` - 13 edges
2. `compilerOptions` - 13 edges
3. `apiFetch()` - 12 edges
4. `scripts` - 12 edges
5. `cn()` - 11 edges
6. `detectSubscriptionCandidates()` - 9 edges
7. `Button` - 9 edges
8. `useLedgerMutations()` - 8 edges
9. `withTenant()` - 7 edges
10. `TenantScope` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Ledgerly Icon` --conceptually_related_to--> `Architecture`  [INFERRED]
  apps/frontend/src/app/icon.svg → README.md
- `Parser Behavior` --semantically_similar_to--> `Deterministic Parser`  [INFERRED] [semantically similar]
  README.md → docs/PRD.md
- `Row Level Security Concept` --semantically_similar_to--> `Security And Data Isolation`  [INFERRED] [semantically similar]
  docs/PROJECT_WORKING_DOCUMENT.md → README.md
- `Security And Data Isolation` --semantically_similar_to--> `Core Tenant Isolation Guarantee`  [INFERRED] [semantically similar]
  README.md → docs/PRD.md
- `AI Insights` --semantically_similar_to--> `AI Insights Privacy Boundary`  [INFERRED] [semantically similar]
  README.md → docs/PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tenant Isolation Pattern** — docs_prd_core_guarantee, readme_security_and_data_isolation, docs_project_working_document_row_level_security [INFERRED 0.95]
- **Transaction Processing Pipeline** — readme_parser_behavior, docs_prd_deterministic_parser, docs_project_working_document_transaction_extraction, docs_project_working_document_csv_import_workflow, docs_project_working_document_duplicate_detection [INFERRED 0.85]
- **Verification And Runtime Database Setup** — _github_workflows_ci_ci_workflow, _github_workflows_ci_postgres_service, _github_workflows_ci_runtime_role_setup, docker_compose_postgres_service, docker_compose_runtime_role_init_script, readme_local_setup [INFERRED 0.85]

## Communities (36 total, 6 thin omitted)

### Community 0 - "Frontend Ledger UI"
Cohesion: 0.10
Nodes (39): initials(), LedgerShell(), navigation, Button, ButtonProps, buttonVariants, Input, ImportScreen() (+31 more)

### Community 1 - "Backend Auth Tenant DB"
Cohesion: 0.07
Nodes (34): @prisma/client, auth, AuthSession, prisma, withTenant(), demoUsers, env, frontendOrigins() (+26 more)

### Community 2 - "Backend API Validation"
Cohesion: 0.07
Nodes (27): authErrorResponse(), AuthPayload, authResultFrom(), authTokenFrom(), categoryRuleBodySchema, cleanAccountLabel(), csvCell(), emailSchema (+19 more)

### Community 3 - "Dashboard Transactions UI"
Cohesion: 0.07
Nodes (23): AnalyticsCharts(), AnalyticsSummary, buildQuery(), CategoryRule, chartColors, compactFilters(), currencySymbol(), Dashboard() (+15 more)

### Community 4 - "Frontend Package Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @auth/core, better-auth, class-variance-authority, clsx, @ledgerly/shared, lucide-react, next (+23 more)

### Community 5 - "Analytics AI Insights"
Cohesion: 0.11
Nodes (27): AnalyticsSummary, getAnalyticsSummary(), roundMoneyObject(), summarizeTransactions(), TenantDb, buildCurrencyContext(), currencySymbol(), generateSpendingInsights() (+19 more)

### Community 6 - "Shared API Contracts"
Cohesion: 0.09
Nodes (25): currencyCodeSchema, ImportBatchResponse, importCreateBodySchema, importPreviewBodySchema, isValidIsoDate(), StructuredError, TransactionFilters, transactionFilterSchema (+17 more)

### Community 7 - "Transaction Parser Engine"
Cohesion: 0.13
Nodes (27): builtInCategory(), CategoryRuleInput, cleanAccountLabel(), cleanDescription(), createTransactionDrafts(), DateHit, ExtractedTransaction, extractedTransactionSchema (+19 more)

### Community 8 - "Root Test Tooling"
Cohesion: 0.08
Nodes (25): devDependencies, jest, @playwright/test, prisma, ts-jest, tsx, @types/jest, @types/node (+17 more)

### Community 9 - "Frontend Routes API Client"
Cohesion: 0.12
Nodes (8): BackendUnconfiguredError, BackendUnreachableError, DuplicateEmailError, { handlers, auth, signIn, signOut }, normalizeUrl(), resolveBackendInternalUrl(), resolveFrontendOrigin(), LedgerApp()

### Community 10 - "Backend Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-auth/prisma-adapter, dotenv, hono, @hono/node-server, @ledgerly/shared, openai (+10 more)

### Community 11 - "Shadcn UI Configuration"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 12 - "Rate Limiting"
Cohesion: 0.18
Nodes (6): assertWithinRateLimit(), limiter, MemoryRateLimiter, RateLimiter, RedisEvalClient, RedisRateLimiter

### Community 13 - "Auth Pages Forms"
Cohesion: 0.20
Nodes (8): AuthForm(), AuthFormProps, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 14 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+5 more)

### Community 15 - "Frontend TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, incremental, jsx, noEmit, paths, plugins, exclude (+4 more)

### Community 16 - "Shared Package Config"
Cohesion: 0.15
Nodes (12): dependencies, zod, devDependencies, main, name, private, scripts, build (+4 more)

### Community 17 - "Shared UI Primitives"
Cohesion: 0.27
Nodes (7): Badge(), BadgeProps, badgeVariants, Label, Separator(), Textarea, cn()

### Community 18 - "Backend TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, outDir, paths, types, extends, include, @/*, @ledgerly/shared

### Community 19 - "Import Pipeline Docs"
Cohesion: 0.22
Nodes (9): Ledgerly Icon, Deterministic Parser, CSV Import Workflow, Duplicate Detection, Transaction Extraction, API Surface, Architecture, Category Rules (+1 more)

### Community 20 - "CI Database Setup"
Cohesion: 0.25
Nodes (8): CI Workflow, Playwright E2E Tests, Postgres CI Service, Quality Checks, Runtime Role Setup, Postgres Service, Runtime Role Init Script Mount, Local Setup

### Community 21 - "Tenant Isolation Architecture"
Cohesion: 0.25
Nodes (8): Better Auth Decision, Core Tenant Isolation Guarantee, Solution, Authentication Model, High Level Architecture, Row Level Security Concept, Tenant Workspace Model, Security And Data Isolation

### Community 22 - "App Layout Providers"
Cohesion: 0.33
Nodes (4): geist, geistMono, metadata, Providers()

### Community 23 - "Table UI Components"
Cohesion: 0.29
Nodes (6): Table, TableBody, TableCell, TableHead, TableHeader, TableRow

### Community 24 - "NextAuth Types"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 25 - "Package TypeScript Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 26 - "AI Privacy Docs"
Cohesion: 0.67
Nodes (3): AI Insights Privacy Boundary, Subscription Detection, AI Insights

## Knowledge Gaps
- **221 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+216 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `withTenant()` connect `Backend Auth Tenant DB` to `Backend API Validation`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `Backend Auth Tenant DB` to `Backend Runtime Dependencies`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Backend Auth Tenant DB`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Ledger UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09711779448621553 - nodes in this community are weakly interconnected._
- **Should `Backend Auth Tenant DB` be split into smaller, more focused modules?**
  _Cohesion score 0.07358156028368794 - nodes in this community are weakly interconnected._
- **Should `Backend API Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.06543385490753911 - nodes in this community are weakly interconnected._