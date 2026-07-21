---
title: Settings pane search + expand/collapse-all context menu
type: requirements
status: active
date: 2026-04-23
---

# Settings pane search + expand/collapse-all context menu

## Overview

Add two complementary affordances to the project-setup settings pane:

1. **A search box at the top of the pane** that filters the pane to the
   settings matching the user's query.
2. **A right-click context menu anywhere in the pane** with "Expand all
   categories" and "Collapse all categories", mirroring Power BI Desktop's
   Format pane behaviour.

The combined intent is to improve discoverability as the pane grows, without
redesigning the accordion structure itself.

## Problem Frame

The settings pane now has a larger number of accordion sections (Dataset,
General, Performance, Provider, Render Mode, etc.) and each section can host
a non-trivial number of controls. The pane is `multiple` + `collapsible`, so
nothing forces users into a single-expanded model, but:

- First-time or infrequent users don't know where a specific setting lives
  and fall back to clicking through every section.
- Power users know a setting exists but still have to scroll and expand to
  reach it.
- Bulk expand/collapse today costs one click per section.

This is proactive rather than driven by a specific Deneb support ticket —
but it is **not speculative**. Power BI's own format pane has the same
class of problems (dense, collapsible, many knobs) and Microsoft already
ships search + right-click Expand/Collapse-all in that pane. Users coming
to Deneb from Power BI carry that muscle memory; mirroring the pattern
follows a proven, well-trodden design rather than inventing one.

## Users

One UI must serve both cohorts:

- **First-timers** — type a rough term ("format", "highlight", a field
  name) and want to see what settings exist and where they live.
- **Power users** — know the label, want the fastest possible path to it.

## Goals

- Make it possible to locate any setting in the pane by typing a term that
  matches any text a user could reasonably associate with it.
- Cut clicks to expand/collapse every section to one.
- Keep the pane's default (no-query) behaviour identical to today's.

## Non-Goals / Scope Boundaries

- **No redesign of the accordion structure or section groupings.** Only
  additive: search + context menu.
- **No new taxonomy, synonyms, tagging, or hand-curated search index.**
  Index is derived from existing i18n strings and dataset state.
- **No fuzzy / typo-tolerant matching in v1.** Case-insensitive substring
  only.
- **No deep-linking or shareable URLs to individual settings.**
- **No scroll-spy, sticky section navigator, or pill-bar ToC.** Search
  replaces the need for those at current pane size.
- **No cross-session persistence.** Search state lives within the session.

## Requirements

### R1. Search input

- A Fluent `SearchBox` (or equivalent) pinned at the top of the settings
  pane, above the accordion.
- Placeholder copy tells the user what it does (e.g. "Search settings…").
- Clear button (native Fluent affordance) returns to the unfiltered pane.
- `Escape` in the input clears the query; focus stays in the input.
- **Narrow pane behaviour:** when the pane width drops below a threshold
  the input shrinks along with the rest of the pane content. Label and
  placeholder remain; the input does not collapse to an icon-only state.

### R2. Search scope (what gets matched)

Case-insensitive substring match against the **currently active locale's**
translated strings for:

- Section heading translation keys (e.g. `Text_Settings_Dataset`,
  `Text_Vega_Performance`).
- Setting labels inside each section (Radio / Switch / SpinButton labels,
  support-field flag labels like `Text_SupportField_Highlight`, etc.).
- `InfoLabel` assistive text (e.g. `Assistive_Text_SupportField_Highlight`).
- **Live dataset field names** as they appear in the Dataset section
  (unlocalised user input).

### R3. Filter semantics (general)

When the query is non-empty:

- Sections with **no matching content collapse and are hidden** from the
  rendered accordion.
- Sections with **matching content auto-expand** and are visible.
- Within a matching section, only rows whose label / assistive text matches
  the query remain visible; sibling rows are hidden.
- Section heading matches count as a match for the whole section (all rows
  inside stay visible).

### R4. Filter semantics — Dataset section (tree)

Because the Dataset section is a field-with-nested-flags tree:

- A **field-name match** keeps the field row **and all its currently
  applicable flag children** visible (so the user can configure it).
- A **flag-label or flag-assistive-text match** keeps only the matching
  flag rows plus their parent field row (parent stays for context).
- A field with neither its own name nor any of its applicable flags
  matching is hidden.
- Contextual UI that lives alongside tree rows — the role icon, Reset
  button, enabled-flag hint dot, and the two cross-highlight `MessageBar`s
  (Case 1 / Case 2) — remains visible whenever the Dataset section is
  visible. These are not searchable content; they are context for whatever
  filtered rows are shown.

### R5. Right-click context menu

- Opens on right-click **anywhere inside the settings pane**.
- Suppresses the native browser context menu within the pane boundary
  (documented trade-off: loses native "Inspect element" while hovering the
  pane).
- Items:
  - **Expand all categories** — opens every accordion section that is
    currently visible.
  - **Collapse all categories** — closes every accordion section that is
    currently visible.
- **Filter-aware by default.** During an active search, "Expand all"
  operates only on sections that contain matches (which will already be
  auto-expanded anyway, so the action primarily exists for symmetry);
  "Collapse all" collapses matching sections.
- When no query is active, both actions operate on every section.

### R6. Empty state

When a non-empty query returns zero matches:

- The accordion area is replaced with a **short centred message** in the
  same locale as the UI (e.g. "No settings match \"foo\".").
- The search input stays focused and populated. Clearing it (via clear
  button or `Escape`) restores the full pane.
- No toast, no banner.

### R7. Persistence

- Search term **persists within the session** — closing and reopening the
  pane (or tabbing to another app surface and back) restores the last
  query.
- Does **not** survive a page reload / visual re-init. Not written to
  persisted project state.
- Section expanded/collapsed state stays on its existing persistence model
  (unchanged by this work).

### R8. Accessibility and keyboard

- Search input is a real `<input type="search">` with an accessible name
  (via label or `aria-label`) localised to the active locale.
- **`/` keyboard shortcut** focuses the search input when the settings
  pane is visible AND no text-entry control (including Monaco editors,
  existing text inputs, textareas, or contenteditable elements) currently
  has focus. Matches GitHub / Gmail convention.
- Typing into the input does not steal focus from an actively-focused
  control outside the pane; focus moves to the input only when the user
  clicks it, tabs to it, or presses `/` per above.
- `Escape` in the input clears the query (as above); in the pane outside
  the input, `Escape` has no new behaviour.
- Context menu opens via `Shift+F10` / `Menu` key on any focused element
  inside the pane, same items as right-click.
- Empty-state message is reachable by screen readers as a status region.

### R9. Reactivity

- Filter output re-evaluates when:
  - The query changes.
  - The set of visible / applicable flags changes mid-search (e.g.
    toggling `consolidateFieldParameters`, `interactivity.highlight`).
  - Dataset fields are added / removed / renamed.

### R10. Match highlighting

- Within each visible row that is shown because of a match, the matching
  substring(s) are rendered with a light visual highlight (e.g. a tinted
  background or a token style) inside the row label.
- Highlighting is applied to whichever searchable surface produced the
  match: section heading, setting label, flag label, assistive text
  preview, or dataset field name.
- Highlighting is decorative — it does not change the clickable target,
  focus order, or ARIA semantics of the row.

### R11. Ordering of results

- The visible filtered pane preserves the existing accordion order:
  sections appear in the same order they do without a query; rows within
  a section appear in their existing order.
- No cross-section re-ranking (no "most relevant section first" sort). A
  match's position in the filtered view is a subset of its position in
  the unfiltered view.

## Success Criteria

- A first-time user, given a vague noun ("highlight", "format", a dataset
  field name), can type it into the search box and see the matching
  settings auto-expanded within two seconds, without having to click any
  section.
- A power user can expand or collapse the entire pane with a single
  right-click action, matching Power BI Desktop's Format pane muscle
  memory.
- When the query is cleared, the pane returns to exactly the state it was
  in before the search began (same sections open, same scroll position
  within tolerance).

## Open Questions (deferred to planning)

- **Context-menu placement on touch / trackpad long-press.** Low-priority
  edge case; Deneb is typically used with a mouse/keyboard inside Power
  BI Desktop, but worth deciding how long-press behaves on touch devices
  during planning.
- **Exact highlight styling token.** R10 commits to a light highlight
  style; the specific Fluent token / contrast choice is left for design
  review during planning.
- **Search debounce window.** Whether the filter runs on every keystroke
  or with a short debounce (and the threshold) is a perf/feel call best
  made during planning once the index size is measured.

## Risks / Assumptions

- **Global `contextmenu` suppression inside the pane** is a deliberate
  product decision, not a trade-off: we don't want the browser context
  menu in this surface and accept the loss of native "Inspect element"
  while hovering the pane.
- **Live dataset field names are unbounded** in length and character set.
  Index lookup must tolerate special characters and non-Latin scripts.
- **Translation coverage** for the assistive text strings varies; a
  locale with thin translations will search against the English fallback
  where applicable, which matches current behaviour elsewhere in the app.
- **Applicable-flags changes during search** (R9) must not leave the
  filter in a stale state — this is the most likely source of bugs.
- **`/` shortcut focus-guard** (R8) must cover every text-entry surface
  that can host focus inside Deneb, including Monaco editors. A missed
  surface causes the `/` key to be eaten mid-typing — a high-visibility
  bug.

## References

- Power BI Desktop Format pane — archetype for right-click
  Expand-all / Collapse-all.
- VS Code Settings UI — archetype for search-in-pane behaviour.
- [packages/app-core/src/features/settings-pane/components/settings-pane.tsx](packages/app-core/src/features/settings-pane/components/settings-pane.tsx) —
  current accordion entry point.
- [packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx) —
  the Dataset section tree, which drives the special R4 tree-filter rule.
