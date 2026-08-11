# Product

## Register

product

## Users

Ledgerly is for people who receive transaction records as inconsistent bank alerts, copied statement rows, and plain text. They want a fast way to turn that material into a ledger they can inspect without giving a third-party model raw financial text. The primary workflow is importing, reviewing, and understanding personal transactions inside a private authenticated workspace.

The repository also serves a second audience: software-engineering interviewers. Its architecture and interface must make correctness, tenant isolation, deterministic parsing, and thoughtful product judgment easy to verify.

## Product Purpose

Ledgerly converts messy transaction text into structured, editable records, then provides filters, analytics, recurring-charge detection, and optional aggregate-only insights. Success means a user can understand what was parsed, correct uncertainty before saving, and trust that every query is scoped to their tenant.

## Brand Personality

Calm, trustworthy, operational. The voice is direct and specific, particularly around money, privacy, errors, and destructive actions. The product should feel quietly capable: dense enough for real work, restrained enough that the financial data remains the focus.

## Anti-references

- Trading-terminal cosplay with black surfaces, neon ticks, and artificial urgency.
- Generic AI-finance dashboards built from interchangeable metric cards, gradients, and vague claims.
- Gamified budgeting products that use confetti, shame, or red-versus-green color as the only signal.
- Decorative glassmorphism, oversized radii, and motion that delays the task.
- Security claims that are not backed by visible architecture, tests, or precise product behavior.

## Design Principles

1. **Make trust inspectable.** Show what the parser found, what needs review, how ownership is derived, and what information leaves the system.
2. **Keep money unambiguous.** Always display currency, sign, date, and debit or credit meaning explicitly; never combine unrelated currencies.
3. **Review before commitment.** Parsing creates editable drafts first. Uncertainty and duplicates remain visible until the user decides what to save.
4. **Let the tool disappear.** Use familiar controls, compact hierarchy, and predictable feedback so users can stay focused on the ledger.
5. **Earn every claim.** Documentation, UI copy, tests, and deployed behavior must describe the same system.

## Accessibility & Inclusion

Meet WCAG 2.2 AA. All core workflows must be keyboard-operable with visible focus, persistent labels, semantic landmarks, and appropriately announced loading, success, and error states. Touch targets should be at least 44 by 44 CSS pixels where practical. Reduced-motion preferences are respected. Charts, confidence, duplicate status, and transaction type must have text equivalents and must never depend on color alone.
