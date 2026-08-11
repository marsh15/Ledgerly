---
name: Ledgerly
description: A quiet, trustworthy workspace for turning bank text into an inspectable private ledger.
colors:
  canvas: "#F7FAF9"
  surface: "#FFFFFF"
  ink: "#0F1726"
  emerald: "#0A684F"
  emerald-deep: "#07513E"
  emerald-soft: "#EAF5F1"
  muted-surface: "#F1F5F4"
  muted-ink: "#52665F"
  amber-soft: "#FFF4D8"
  amber-ink: "#6D4713"
  border: "#D8E2DE"
typography:
  headline:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.emerald-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Ledgerly

## Overview

**Creative North Star: "The Quiet Ledger"**

Ledgerly feels like a well-kept financial notebook translated into a precise digital tool. It is light, legible, and calm under sustained use. Dense information is organized through alignment, typography, and tonal surfaces instead of decorative containers.

The system is product-first. Familiar controls and restrained motion let the interface disappear behind review, filtering, and analysis. It rejects trading-terminal cosplay, generic AI-finance dashboards, gamified budgeting, decorative glassmorphism, and any security claim the product cannot demonstrate.

**Key Characteristics:**

- Quiet, cool-neutral surfaces with one authoritative emerald action color.
- Compact but readable typography with tabular financial figures.
- Visible uncertainty, duplicate status, privacy boundaries, and next actions.
- Structural responsive behavior rather than shrinking type or hiding core controls.
- State-driven motion only, with reduced-motion support.

## Colors

The palette is cool, restrained, and functional. Emerald marks primary actions, current context, and positive confirmation; it is never background decoration.

### Primary

- **Ledger Emerald:** The authoritative action and focus color. Use it for primary buttons, current navigation, and meaningful confirmation.
- **Deep Ledger Emerald:** The hover and active treatment for primary controls.
- **Mint Wash:** A quiet contextual surface for selected or privacy-related information.

### Tertiary

- **Review Amber:** A warning surface for uncertainty, duplicates, and items needing review.
- **Review Ink:** Text and icons on Review Amber.

### Neutral

- **Cool Canvas:** The application background.
- **Clean Surface:** Forms, tables, and elevated work areas.
- **Ledger Ink:** Primary copy and financial values.
- **Quiet Surface:** Toolbars, skeletons, and secondary regions.
- **Quiet Ink:** Supporting copy that still meets AA contrast.
- **Ledger Rule:** Borders, dividers, and field outlines.

### Named Rules

**The One Authority Rule.** Emerald is reserved for actions, focus, selection, and confirmed state. If it appears as decoration, remove it.

**The Explicit State Rule.** Success, warning, error, debit, and credit always include words or icons. Color never carries the meaning alone.

## Typography

**Display Font:** Geist (with Inter, system UI, and sans-serif fallbacks)
**Body Font:** Geist (with Inter, system UI, and sans-serif fallbacks)
**Label/Mono Font:** Geist Mono (with ui-monospace fallback)

**Character:** One neutral, modern sans keeps the product coherent. Weight, spacing, and tabular figures create hierarchy without introducing a decorative display face.

### Hierarchy

- **Headline** (650, 32px, 1.15): Route titles and rare high-level product statements.
- **Title** (650, 20px, 1.25): Work-area and section headings.
- **Body** (400, 15px, 1.6): Interface explanation and supporting copy, capped near 70 characters per line.
- **Label** (600, 13px, 1.35): Persistent form labels, table headers, and compact metadata.
- **Financial data** (500-650, 13-16px): Tabular numbers with explicit currency and sign.

### Named Rules

**The Accounting Line Rule.** Columns of currency, confidence, dates, and balances use tabular numerals and align by value, not by decoration.

## Elevation

Ledgerly is flat by default. Background shifts and 1px rules establish most hierarchy. Small, tight shadows are reserved for floating overlays and focused authentication surfaces; ordinary cards do not pair a border with a wide decorative shadow.

### Shadow Vocabulary

- **Control lift** (`0 1px 2px rgba(15, 23, 38, 0.06)`): Inputs and primary actions only.
- **Floating layer** (`0 8px 24px rgba(15, 23, 38, 0.10)`): Menus, dialogs, and toasts only.

### Named Rules

**The Flat-by-Default Rule.** If removing a shadow does not reduce comprehension, the shadow is forbidden.

## Components

Components are restrained, consistent, and explicit across every state.

### Buttons

- **Shape:** Gently squared corners (8px) with a minimum 44px touch height.
- **Primary:** Ledger Emerald with white text and compact 10px by 16px padding.
- **Hover / Focus:** Deep Emerald on hover; a visible two-pixel emerald focus ring with canvas offset.
- **Secondary / Ghost:** White or transparent, Ledger Rule outline where necessary, and no decorative shadow.

### Chips

- **Style:** Compact 6px corners, text plus icon or explicit label, and a border or tonal fill.
- **State:** Debit, credit, saved, needs review, duplicate, and confidence remain understandable without hue.

### Cards / Containers

- **Corner Style:** Modest 12px maximum radius.
- **Background:** Clean Surface over Cool Canvas; Quiet Surface for toolbars and loading states.
- **Shadow Strategy:** Flat at rest; Floating Layer applies only to actual floating content.
- **Border:** Ledger Rule when a boundary is needed, never a colored side stripe.
- **Internal Padding:** 16px on compact groups and 24px on primary work areas.

### Inputs / Fields

- **Style:** White field, Ledger Rule border, 8px corners, persistent label, and minimum 44px height.
- **Focus:** Border moves toward Ledger Emerald and receives a visible focus ring.
- **Error / Disabled:** Error text is associated with the field; disabled controls retain legibility and explain the unavailable action where needed.

### Navigation

Desktop navigation uses a compact application rail or clear top-level route set. Active routes use text, weight, and a quiet emerald surface. Mobile navigation exposes the same destinations through a labeled control and returns focus correctly.

### Transaction Review

Drafts preserve parser output, confidence, validation gaps, and duplicate warnings in one editable unit. Saving remains unavailable until every required field is valid.

## Do's and Don'ts

### Do:

- **Do** keep financial values explicit with currency codes or symbols, signs, and tabular numerals.
- **Do** keep body and placeholder text at WCAG 2.2 AA contrast or higher.
- **Do** distinguish empty accounts from empty filtered results and provide the next useful action.
- **Do** use 150-220ms state transitions and remove non-essential motion for reduced-motion users.
- **Do** make tenant isolation and aggregate-only AI behavior inspectable in copy and documentation.

### Don't:

- **Don't** use trading-terminal cosplay with black surfaces, neon ticks, and artificial urgency.
- **Don't** build generic AI-finance dashboards from interchangeable metric cards, gradients, and vague claims.
- **Don't** use gamified budgeting, confetti, shame, or red-versus-green color as the only signal.
- **Don't** use decorative glassmorphism, oversized radii, gradient text, or colored side-stripe borders.
- **Don't** pair 1px borders with wide decorative shadows on cards or buttons.
- **Don't** combine unrelated currencies into one total or chart.
- **Don't** make security claims that are not backed by visible architecture, tests, or precise behavior.
