# 04 — UI/UX Design Brief: Ledgerly

## Design Intent

Ledgerly should feel calm, trustworthy, and operational: a finance workspace that makes dense information easy to scan without looking like a trading terminal. The visual language is clean and editorial, with restrained color, clear hierarchy, tabular numbers, and deliberate feedback around sensitive or destructive actions.

## Visual System

### Palette

- Canvas: white (`hsl(0 0% 100%)`).
- Primary text: deep ink (`hsl(221 42% 10%)`).
- Primary/action: dark emerald (`hsl(164 82% 22%)`).
- Secondary surface: pale green (`hsl(160 32% 94%)`).
- Muted surface: cool gray (`hsl(210 20% 97%)`).
- Accent/warning surface: warm amber (`hsl(38 88% 93%)`).
- Borders: cool gray (`hsl(216 24% 89%)`).
- Destructive, success, warning, and informational colors must always include text or icon cues; color alone cannot carry meaning.

The initial product is light-mode first. A dark theme is not required for v1; if introduced, it must use semantic tokens rather than component-specific color overrides.

### Typography

- Geist Sans for interface text and headings.
- Geist Mono for IDs, technical values, and machine-formatted content.
- Use a compact modular scale: 14–16px body text, 20–24px section titles, and 32–40px primary page/marketing headings.
- Financial values use `font-variant-numeric: tabular-nums` and unambiguous currency labels.
- Body copy should generally remain below 70 characters per line.

### Components

- Corners are modest (6–10px), never pill-shaped by default.
- Borders and spacing establish grouping; shadows are subtle and reserved for floating layers.
- Inputs are at least 44px high with persistent labels, descriptions when needed, and nearby error text.
- Cards use consistent padding and align numeric baselines.
- Tables remain the default for wide transaction views; small screens use stacked rows/cards without hiding essential values.
- Charts include text summaries, legends, tooltips, and accessible fallback information.

## Layout

- Desktop application: compact horizontal navigation plus a fluid content column capped for readable density.
- Main pages use a consistent header zone: eyebrow/context, title, concise description, and primary action.
- Overview uses a summary grid followed by trends and breakdown panels.
- Transaction and rule screens prioritize filters/actions above the data region.
- Import uses a staged workflow: input, preview/review, confirmation.
- Spacing follows a 4px base scale, with 8, 12, 16, 24, 32, and 48px as primary intervals.

## Interaction Patterns

- Primary actions use the emerald treatment; secondary and tertiary actions remain visually quieter.
- Pending actions replace their label with a specific verb such as “Saving…” and disable duplicate submission.
- Success feedback confirms the object and outcome, not merely “Success.”
- Optimistic changes visibly settle when confirmed and restore prior state on failure.
- Destructive actions require clear naming (“Delete transaction”, “Roll back import”) and confirmation.
- Filters should be shareable in URL state when practical and always offer a clear reset.
- Animation is restrained: 120–220ms transitions for state changes; reduced-motion preferences are respected.

## Responsive Behavior

- Breakpoint decisions follow content pressure, not device names.
- At narrow widths, navigation remains scrollable and page actions wrap without hiding core destinations.
- Summary cards become one or two columns.
- Wide tables become stacked transaction summaries with disclosure for secondary fields.
- Charts preserve readable labels and may scroll horizontally only when simplification would distort the data.
- No core action depends on hover.

## Accessibility Requirements

- Meet WCAG 2.2 AA contrast for text and meaningful controls.
- All functionality is keyboard-operable with a visible focus indicator.
- Use semantic headings, landmarks, tables, labels, and buttons before adding ARIA.
- Touch targets are at least 44 by 44 CSS pixels where feasible.
- Validation errors are associated with controls and announced to assistive technology.
- Loading, success, and failure changes use an appropriate live region without excessive announcements.
- Charts and status indicators have non-visual equivalents.
- Currency, signs, dates, and debit/credit labels remain explicit; do not depend on red/green conventions.

## Content Voice

Use direct, calm language. Explain what happened, why it matters, and the next safe action. Avoid blame, financial advice, or claims that deterministic categorization is always correct. Use “transaction”, “import”, “needs review”, and “possible duplicate” consistently.
