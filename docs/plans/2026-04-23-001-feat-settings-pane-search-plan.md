---
title: 'feat: Settings pane search + expand/collapse-all context menu'
type: feat
status: active
date: 2026-04-23
origin: docs/brainstorms/2026-04-23-settings-pane-search-requirements.md
---

# feat: Settings pane search + expand/collapse-all context menu

## Overview

Add two complementary affordances to the project-setup settings pane:

1. A **SearchBox** pinned above the accordion that filters the pane to
   matching settings (section headings, setting labels, assistive / info-
   popover text, live dataset field names).
2. A **right-click context menu** anywhere inside the pane with
   "Expand all categories" / "Collapse all categories", mirroring Power BI
   Desktop's Format pane behaviour.

Both are additive. Nothing existing changes when there's no query and no
context-menu interaction.

(See origin: [docs/brainstorms/2026-04-23-settings-pane-search-requirements.md](docs/brainstorms/2026-04-23-settings-pane-search-requirements.md).)

## Problem Frame

The settings pane has three top-level sections today — `general` (Provider,
Render Mode, Scale-to-Zoom), `performance`, `dataset` — plus an optional
platform-injected section and an optional footer. The pane is `multiple` +
`collapsible` (see [packages/app-core/src/features/settings-pane/components/settings-pane.tsx](packages/app-core/src/features/settings-pane/components/settings-pane.tsx)).
Both cohorts (first-timers who don't know where a setting lives, power users
who want to skip scrolling) benefit from a search primitive; Power BI's own
Format pane ships the same pattern so users already carry the muscle memory.

## Requirements Trace

Directly from the origin document's R1–R11.

- R1. SearchBox pinned at top of pane; clear button; `Escape` clears;
  shrinks under narrow widths but stays labelled.
- R2. Match scope: section headings + setting labels + `InfoLabel` assistive
  text + live dataset field names; case-insensitive substring on the active
  locale's translated strings plus the raw dataset field names.
- R3. Filter semantics (general): sections with no matches are hidden;
  sections with matches auto-expand; non-matching rows within a matching
  section are hidden; a section-heading match keeps the whole section.
  **Accordion chevrons are click-suppressed while a query is active** —
  users reorient by clearing the query, not by manual toggle. The pane
  sets `effectiveOpenItems = [...matchedSections]` and `onToggle = noop`
  during search.
- R4. Dataset tree filter: field-name match keeps the field + all its
  applicable flags; flag-label / assistive-text match keeps just the
  matching flag rows plus their parent field; role icon, Reset button,
  enabled-flag hint, and the two `MessageBar`s stay whenever the Dataset
  section is visible.
- R5. Right-click context menu opens anywhere inside the pane; native
  browser contextmenu is suppressed inside the pane region; items
  "Expand all categories" and "Collapse all categories"; both are
  filter-aware (operate on visible sections).
- R6. Empty state: short centred "No settings match \"foo\"." when the
  query yields zero matches.
- R7. Persistence: query persists within the session (closing/reopening
  the pane restores the term); no reload persistence; section open-state
  keeps its existing in-memory persistence model.
- R8. Accessibility: real `<input type="search">`; `/` focus shortcut
  guarded against text-entry surfaces (inputs, textareas, contenteditable,
  Monaco editors); `Shift+F10` / Menu key opens the context menu from
  keyboard focus.
- R9. Reactivity: filter re-evaluates on query change, on applicable-flag
  changes mid-search, and on dataset field add / remove / rename.
- R10. Light match highlighting inside matched rows (matched substrings
  rendered with a tinted background / token style). When a row matches
  **only** on its assistive text, a short inline highlighted preview
  line renders below the label so the user sees why the row was
  surfaced without opening the info popover.
- R11. Ordering preserves existing accordion / in-section order; no
  cross-section ranking.

## Scope Boundaries

- **No redesign of the accordion structure or section order.** Existing
  sections stay where they are; no new grouping.
- **No fuzzy / typo-tolerant search.** Case-insensitive substring only.
- **No synonyms, tagging, or hand-curated index.** Index derives from
  existing i18n strings and live dataset state.
- **No deep-linking to individual settings** and no URL fragment for the
  current query.
- **No cross-session persistence.** Search state and pane open-state both
  stay in-memory; not written to persisted project state.
- **No new localised translations for the new UI strings.** English keys
  ship now; non-English translations are a follow-up (documented below).
- **Search is locale-specific.** The engine indexes the active locale's
  translated strings. A German-locale user searching for the English
  word "format" will match only if the German translation happens to
  contain that substring. This is acceptable — users generally search in
  their own language — but it means a user with partial English muscle
  memory from Power BI documentation may not find a setting by its
  English key. Cross-locale aliasing is out of scope.

## Context & Research

### Relevant Code and Patterns

- [packages/app-core/src/features/settings-pane/components/settings-pane.tsx](packages/app-core/src/features/settings-pane/components/settings-pane.tsx) —
  accordion entry point; currently owns `openItems` via a module-level
  ref (`persistedOpenItems`). That ref moves into a Zustand slice in Unit 2.
- [packages/app-core/src/features/settings-pane/components/settings-accordion-item.tsx](packages/app-core/src/features/settings-pane/components/settings-accordion-item.tsx) —
  shared wrapper around `AccordionItem`/`AccordionHeader`/`AccordionPanel`.
  Extend in Unit 4 so a section heading can be wrapped in a highlight span.
- [packages/app-core/src/features/settings-pane/components/general-settings.tsx](packages/app-core/src/features/settings-pane/components/general-settings.tsx),
  [packages/app-core/src/features/settings-pane/components/performance-settings.tsx](packages/app-core/src/features/settings-pane/components/performance-settings.tsx) —
  flat form sections. Rows use `Field`/`InfoLabel`/`Radio`/`Switch`/
  `SpinButton`. All labels come from `translate(key)`.
- [packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx) —
  the Dataset tree (field → flag children) with Fluent `Tree`; Unit 5
  targets this file specifically for the tree-filter rule.
- [packages/app-core/src/state/state.ts](packages/app-core/src/state/state.ts) —
  composite Zustand `StoreState` using devtools + createWithEqualityFn +
  shallow. New slice follows the same pattern as `InterfaceSlice` /
  `EditorPreferencesSlice`.
- [packages/app-core/src/app/editor/hooks/use-editor-hotkeys.ts](packages/app-core/src/app/editor/hooks/use-editor-hotkeys.ts) —
  `react-hotkeys-hook` is already a dependency; use it (or a scoped
  variant) for the `/` shortcut.

### Institutional Learnings

- [docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) —
  keep setter actions pure; no DOM focus side-effects inside Zustand
  setters or `useState` updaters. Unit 2's `expandAll` / `collapseAll` /
  `setQuery` follow this rule.
- [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md) —
  when introducing a new section's searchable schema type, prefer a
  narrow `const`-literal shape over a widened string type so call-site
  drift is a compile error.
- No existing `MenuTrigger` / `MenuPopover` usage in `packages/app-core` —
  this pattern is net-new. Fluent UI 9 ships `Menu` / `MenuTrigger` /
  `MenuPopover` / `MenuList` / `MenuItem` as standard.

### External References

None required — existing Fluent UI 9 patterns, existing `react-hotkeys-hook`
dependency, and existing Zustand slice conventions cover everything.

## Key Technical Decisions

- **Pure-function match engine over pre-translated, frozen data.** The
  engine takes resolved string descriptors as input — no `translate`
  closure, no locale awareness. Callers (the pane) walk each section
  schema and resolve every label / assistive / heading key into a frozen
  `ResolvedSectionDescriptor` / `ResolvedDatasetDescriptor` before
  invoking `buildMatchView`. This makes the engine genuinely pure over
  data (not over a function), safely memoisable on `(query, descriptors)`
  identity, and resilient to unstable `translate` identity across
  renders.
- **Hybrid index: static schemas + dynamic Dataset indexer + optional
  platform contribution.** Flat sections (general, performance) export a
  static `SectionSchema` of their searchable row keys. The Dataset
  section contributes a dynamic indexer that reads live fields +
  applicable-flag state. Platform consumers opt in via a new
  `settingsPanePlatformSearchable` contribution on
  `useDenebPlatformProvider`; when absent, the platform section is
  treated as always-visible (safe fallback, documented, not silent).
- **Query lives in a minimal Zustand slice; `openItems` stays local.**
  The new `settingsPane` slice owns only `{ query, setQuery, clearQuery }`
  — session-persistent through the module-singleton store so closing /
  reopening the pane restores the term. `openItems` stays local in
  `settings-pane.tsx` via the existing `useState` + module-level
  `persistedOpenItems` pattern. Context-menu "Expand all" /
  "Collapse all" wire via callback props from the pane, not slice
  actions.
- **Chevrons are read-only during an active query.** When `query !== ''`,
  `effectiveOpenItems = [...matchedSections]` (deterministic from match
  view); `onToggle` is a no-op so user clicks on the accordion chevron
  are ignored. When the query clears, `effectiveOpenItems` reverts to
  the user's `openItems` exactly as it was before the search began. No
  `preSearchOpenItems` snapshot field is needed — `openItems` is
  never mutated by search-driven auto-expand. Users who want to reorient
  their open-state clear the query first.
- **Per-section match view passed as a prop, not via context.** The pane
  computes `MatchView` once per render; for each section component it
  passes the relevant slice as a prop (e.g.
  `<GeneralSettings sectionMatchView={…} />`). No `MatchViewProvider`,
  no `useSectionMatchView` hook — prop-drilling across one level is
  cheaper than a new context primitive.
- **Inline assistive preview for assistive-only matches.** When a row
  matches solely on its `InfoLabel` assistive text, the matched
  sentence (or best substring boundary) is shown as a short highlighted
  preview line **below** the label, so users can see why the row was
  surfaced without opening the popover. Label-only matches highlight
  inline on the label as usual; assistive popovers themselves are not
  auto-opened.
- **HighlightText component.** Reusable `<HighlightText text query />`
  that splits the string at case-insensitive match boundaries and wraps
  matches in a `<mark>` (or tokenised span). Used inside section
  headings, row labels, flag labels, dataset field names, and the
  new assistive preview line.
- **Right-click: Fluent `Menu` with open coordinates.** A controlled
  `Menu` rendered at the pane root; `onContextMenu` sets `open` + the
  target coords; `Shift+F10` / `Menu` key opens at the focused element's
  bounding box. `preventDefault` suppresses the native browser menu
  within the pane region (deliberate; see R5). **Suppression scope is
  the pane's DOM subtree only.** Fluent portals (tooltips, `InfoLabel`
  popovers, the `Menu` itself) mount to `document.body` and are
  therefore outside the pane's subtree — their right-click falls back
  to the native browser menu. That's intentional: the contract is
  "right-click inside the pane's visible rectangle", and portaled
  popovers sit on top of but not inside that rectangle.
- **`/` shortcut via `react-hotkeys-hook` with a focus guard.** Registers
  globally but only fires when the focused element is not an `input`,
  `textarea`, `[contenteditable]`, or inside a `.monaco-editor` subtree.
- **New i18n keys only in English at first.** Five new keys land in
  [packages/app-core/src/i18n/en-US.json](packages/app-core/src/i18n/en-US.json);
  non-English locales will fall back to the English string via the
  existing `translate()` behaviour until translations are added in a
  follow-up.

## Open Questions

### Resolved During Planning

- **Global `contextmenu` suppression inside the pane.** Deliberate
  product decision per R5; documented as such.
- **`/` shortcut.** Uses `react-hotkeys-hook` with dedicated options
  (not the shared `HOTKEY_OPTIONS`); the focus guard covers native
  text-entry elements and Monaco editors; `preventDefault` only runs
  when the guard passes, so `/` remains typeable in the SearchBox
  itself.
- **Narrow-pane behaviour.** `SearchBox` shrinks with the pane; label
  and placeholder remain visible; no icon-only collapse.
- **Match highlighting.** Landed via a small `HighlightText` component;
  starting token pair is `colorBrandBackground2` +
  `colorNeutralForeground1` with WCAG verification as part of Unit 4.
- **Ranking.** No cross-section ranking; existing order preserved.
- **Mid-search chevron clicks are a no-op.** During an active query,
  `effectiveOpenItems` is computed from `matchedSections`; accordion
  `onToggle` is suppressed. Users reorient by clearing the query.
- **Platform section contract.** Platform consumers may opt in via
  `settingsPanePlatformSearchable` on the platform provider; when
  absent, the platform section is always-visible regardless of query
  (safe documented fallback).
- **Engine purity.** Engine consumes pre-translated `Resolved*`
  descriptors frozen by the caller; no `translate` closure inside the
  engine, no locale awareness inside the engine.
- **Match-view context → prop.** `MatchView` is passed to each section
  component as a prop; no React context primitive.
- **`openItems` migration.** Stays local in `settings-pane.tsx` (existing
  `useState` + module-level `persistedOpenItems`). The Zustand slice
  only owns `query`.
- **InfoLabel popover matching.** Assistive text is indexed; matched
  assistive content renders as a short highlighted inline preview
  line below the row label. Popovers are not auto-opened.
- **Dataset indexer scale gate.** Unit 5 must pass a p95
  keystroke-to-paint < 50ms benchmark at 1,000 fields × 7 flags
  before merge. Benchmark uses the existing `benchmarks/` harness.

### Deferred to Implementation

- **Highlight token pair WCAG verification.** Starting choice is
  `colorBrandBackground2` + `colorNeutralForeground1` against
  `colorNeutralBackground2`; fall back to
  `colorBrandBackgroundInverted` + `colorNeutralForegroundOnBrand`
  if the 4.5:1 contrast check fails in either theme. Verification
  happens in Unit 4.
- **Debounce interval on `setQuery`.** Default: no debounce. Unit 5's
  benchmark gate decides. If the gate fails, pick between debounce and
  pre-indexed lower-cased descriptor strings.
- **Context-menu behaviour on touch / trackpad long-press.** Deferred;
  Deneb's primary host is Power BI Desktop with mouse and keyboard.
- **Whether to display a subtle "disabled" visual on accordion chevrons
  while query is active.** Start with cursor/click-no-op only; upgrade
  to a visible disabled treatment if QA surfaces confusion.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for
> review, not implementation specification. The implementing agent should
> treat it as context, not code to reproduce.*

```
   ┌──────────────────────┐     ┌──────────────────────────────────┐
   │ settingsPane slice   │     │ Local to settings-pane.tsx       │
   │   query, setQuery    │     │   openItems (useState)           │
   │   clearQuery         │     │   persistedOpenItems (module ref)│
   └──────────┬───────────┘     └─────────────┬────────────────────┘
              │                                │
              ▼                                ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Pane: once per render                                          │
   │   (1) resolve: SectionSchema[] + platformSearchable? + dataset  │
   │       descriptor factory  →  Resolved*Descriptor[] (frozen)    │
   │   (2) buildMatchView({ query, sections, dataset }) → MatchView │
   │   (3) effectiveOpenItems = query ? [...matchedSections]        │
   │                                     : openItems                │
   │   (4) onToggle = query ? noop : setOpenItems                   │
   └──┬────────────────┬────────────────┬────────────────┬──────────┘
      ▼                ▼                ▼                ▼
  SearchBox       GeneralSec.    PerformanceSec.    DatasetSec.
                  (sectionMatch  (sectionMatch      (sectionMatch +
                   View prop)     View prop)         datasetTree prop)
                        │               │                  │
                        ▼               ▼                  ▼
                   HighlightText in matched surfaces + inline assistive preview

  ContextMenu — receives onExpandAll(visibleSectionIds) / onCollapseAll()
                as callback props from the pane

  EmptyState — shown when query !== '' && matchedSections.size === 0
```

Resolver responsibility (the "translate once" pass, runs each render):

```
resolveSchema(schema, translate) → ResolvedSectionDescriptor
  for each row:
    label     = translate(labelKey)
    assistive = assistiveKey ? translate(assistiveKey) : null
  heading     = translate(headingKey)
  → returns frozen descriptor (no further translate calls inside engine)

resolveDataset({ sourceFields, resolvedFlags, ..., translate })
  → ResolvedDatasetDescriptor  // same pattern, dynamic per-field

resolvePlatform(settingsPanePlatformSearchable, translate)
  → ResolvedSectionDescriptor | null  // null when platform opts out
```

Match view shape (returned from the pure engine):

```
MatchView = {
  matchedSections: Set<SectionId>          // driving which sections render
  rows: Map<SectionId, Map<RowId, {
    visible: boolean
    highlights: { label?: Range[]; assistive?: Range[] }  // per surface
  }>>
  datasetTree?: {
    matchedFields: Map<FieldName, {
      matchReason: 'field-name' | 'flag'
      visibleFlags: Set<FlagKey>            // all flags if field-name match
      highlights: { field?: Range[]; flags: Map<FlagKey, {
        label?: Range[]; assistive?: Range[]
      }> }
    }>
  }
}

Invariant: datasetTree.matchedFields non-empty ⇒
           matchedSections includes 'dataset'
```

Auto-expand + read-only chevrons:

```
if query !== '':
  effectiveOpenItems = [...matchedSections]   // deterministic
  onToggle = noop                              // chevron clicks ignored
else:
  effectiveOpenItems = openItems               // user state, unchanged
  onToggle = setOpenItems
```

## Implementation Units

- [ ] **Unit 1: Pure-function match engine over resolved descriptors**

**Goal:** Ship a standalone module that takes the current query + a set
of **pre-translated** section descriptors + a **pre-translated** dataset
descriptor and returns a fully-resolved `MatchView` (which sections
match, which rows inside them match, and the highlight ranges per
surface). No React, no store coupling, no `translate` closure, no
locale awareness inside the engine.

**Requirements:** R2, R3, R4, R9, R10, R11.

**Dependencies:** None.

**Files:**
- Create: `packages/app-core/src/features/settings-pane/search/types.ts`
- Create: `packages/app-core/src/features/settings-pane/search/match-engine.ts`
- Create: `packages/app-core/src/features/settings-pane/search/highlight-ranges.ts`
- Test: `packages/app-core/src/features/settings-pane/search/__tests__/match-engine.test.ts`
- Test: `packages/app-core/src/features/settings-pane/search/__tests__/highlight-ranges.test.ts`

**Approach:**
- Define the data contracts (all fields other than ids hold **resolved
  strings**; nothing holds i18n keys once it enters the engine):
  - `ResolvedRowDescriptor` = `{ id; label: string; assistive: string | null }`
  - `ResolvedSectionDescriptor` = `{ id; heading: string; rows: ResolvedRowDescriptor[] }`
  - `ResolvedFieldDescriptor` = `{ name; applicableFlags: { key; label: string; assistive: string | null }[] }`
  - `ResolvedDatasetDescriptor` = `{ sectionId: 'dataset'; heading: string; fields: ResolvedFieldDescriptor[] }`
- Locale-aware case folding happens in the **resolver** (caller), not in
  the engine. The resolver decides whether to apply `toLocaleLowerCase`
  based on the active locale; the engine uses the already-normalised
  inputs.
- `computeHighlightRanges(text, query)` returns an array of
  `{ start, end }` slices for case-insensitive substring matches. The
  engine assumes `text` and `query` are already in matching case. Merges
  adjacent / overlapping ranges into one.
- `buildMatchView({ query, sections, dataset })`:
  - Normalises query (already expected lowercase by contract; engine
    is a pure projection).
  - For each section: computes heading and per-row highlight ranges on
    label + assistive surfaces; applies R3 visibility rule.
  - For the dataset descriptor: applies the R4 tree rule (field-name
    match keeps all applicable flags; flag match keeps the flag + its
    parent field).
  - Returns a `MatchView`.
- When `query === ''`, returns an "all visible" marker (short-circuit).
- **Invariant:** when `datasetTree.matchedFields` is non-empty, the
  returned `matchedSections` includes `'dataset'`. Enforced inside the
  engine.

**Patterns to follow:**
- Pure-function / tiny-module style used in [packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts](packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts)
  (named exports, no classes, explicit return types).
- Type-narrowness guidance from the `type-widening-requires-call-site-audit`
  learning: `SectionId` is a union of literal ids, not `string`.

**Test scenarios:**
- Happy path — Query "format" against a synthetic section list with one
  heading "Supporting fields: dataset" and rows including "Format string"
  returns the section and only that row with the expected highlight range.
- Happy path — Empty query returns the all-visible short-circuit; every
  section id appears in `matchedSections`; no highlights emitted.
- Happy path — Case-insensitive: "FORMAT", "Format", "format" all yield
  identical `MatchView`.
- Edge case — Query that matches only a section heading returns the
  whole section as visible with every row unfiltered; highlight ranges
  cover the heading only.
- Edge case — Query that matches only assistive text returns the row with
  the match-range attached to the assistive surface (not the label); the
  label is still rendered but unhighlighted.
- Edge case — Query matches nothing → `matchedSections` is empty; `rows`
  map has no entries; `datasetTree` is undefined.
- Edge case — Adjacent / overlapping match ranges for the same query
  merge into a single range (e.g., query "aa" against text "aaa" emits
  one range covering positions 0-2, not two overlapping ranges at
  0-1 and 1-2). Defines `HighlightText`'s input contract.
- Integration — Query matches only a dataset field name (no section
  heading or flag-label match) returns `matchedSections` containing
  `'dataset'` so the pane does not render the empty state.
- Edge case (Dataset) — Query matches a field name: the field appears
  with **all** `applicableFlags` visible; `matchReason: 'field-name'`.
- Edge case (Dataset) — Query matches a flag label: the flag appears in
  `visibleFlags` with its parent field kept for context;
  `matchReason: 'flag'`; sibling flags on the same field are not visible.
- Edge case (Dataset) — Query matches both a field name and a flag on a
  different field: both fields appear; first has all flags, second has
  only matching flag.
- Edge case (Dataset) — Query matches the section heading
  ("Supporting fields: dataset"): all fields and all their flags visible.
- Edge case — Field name containing the `/` character (our leaf
  TreeItem value separator) is treated as raw text for matching.
- Edge case — Resolver passes an empty `assistive` string: the row is
  treated as non-matching on the assistive surface (label/heading
  matches unaffected). Engine never throws; no `translate` surface
  exists inside the engine.
- Edge case — Adjacent matches with the same query merge cleanly:
  query `"aa"` against `"aaa"` emits one range `0-2`, not two
  overlapping ranges at `0-1` and `1-2`.

**Verification:**
- `match-engine.test.ts` and `highlight-ranges.test.ts` green.
- No React / store / fluent imports in any file under
  `packages/app-core/src/features/settings-pane/search/`.

---

- [ ] **Unit 2: Minimal `settingsPane` slice (query only)**

**Goal:** Add a tiny Zustand slice that owns only the search query, so
closing and reopening the pane within a session restores the term. All
open/close state stays local in `settings-pane.tsx` via the existing
`useState` + module-level `persistedOpenItems` pattern — no migration
of open state into the store.

**Requirements:** R1, R7.

**Dependencies:** None.

**Files:**
- Create: `packages/app-core/src/state/settings-pane.ts`
- Modify: `packages/app-core/src/state/state.ts` (compose new slice into
  `StoreState`)
- Modify: `packages/app-core/src/state/create.ts` (wire slice factory)
- Test: `packages/app-core/src/state/__tests__/settings-pane.test.ts`

**Approach:**
- Slice shape:
  - `query: string` (default `''`)
  - Actions: `setQuery(q)`, `clearQuery()` (equivalent to `setQuery('')`).
- No DOM side effects in any setter (per institutional learning on pure
  setState updaters).
- Slice is session-only — not wired into the project-persistence
  `stateManagement` surface. The module-singleton store gives the same
  "survives remount, not reload" semantics the existing
  `persistedOpenItems` ref relies on today.
- **Explicitly deferred:** no `openItems` migration, no `expandAll` /
  `collapseAll` slice actions, no `preSearchOpenItems`. The pane owns
  open-state via its existing local mechanism; context-menu wires
  `expandAll` / `collapseAll` as callback props in Unit 6.

**Patterns to follow:**
- Existing slice factory style in [packages/app-core/src/state/interface.ts](packages/app-core/src/state/interface.ts),
  [packages/app-core/src/state/editor-preferences.ts](packages/app-core/src/state/editor-preferences.ts).
- `StoreState` composition pattern in [packages/app-core/src/state/state.ts](packages/app-core/src/state/state.ts).

**Test scenarios:**
- Happy path — `setQuery('foo')` updates `query` to `'foo'`.
- Happy path — `clearQuery()` resets `query` to `''`.
- Edge case — Setting the same query twice is idempotent (no spurious
  re-renders with `shallow`).
- Integration — Store survives component remount: mount `<SettingsPane>`,
  `setQuery('foo')`, unmount, remount — the store retains
  `query === 'foo'` (the store is a module-singleton, same lifetime as
  the visual; this replaces the `persistedOpenItems` precedent's
  survive-remount behaviour for the search term).

**Verification:**
- `settings-pane.test.ts` green.
- `StoreState` includes `SettingsPaneSlice`; `create.ts` composes it
  alongside existing slices.

---

- [ ] **Unit 3: SearchBox, resolver, `/` shortcut, read-only chevrons, empty state, platform descriptor contract**

**Goal:** Render the SearchBox above the accordion, wire the query to
the slice, run the pane-level resolver step (keys → resolved strings),
compute `MatchView` once per render, switch to the computed
`effectiveOpenItems` and suppress `onToggle` during search, extend the
platform provider with the new optional `settingsPanePlatformSearchable`
contribution, attach the `/` focus shortcut with a text-entry guard,
and render the empty-state message when the query yields zero matches.

**Requirements:** R1, R3, R6, R7, R8.

**Dependencies:** Unit 1 (engine), Unit 2 (query slice), Unit 4 (section
schemas are first drafted in Unit 4; Unit 3 depends on their existence
for the resolver, so Unit 4 lands first for the schema files — see
Sequencing note below).

**Sequencing note:** Units 3 and 4 share a seam (the schemas + resolver).
Land Unit 4's schema files first so Unit 3's resolver has concrete
imports. Unit 3 then integrates the resolver and pane-level computation.

**Files:**
- Create: `packages/app-core/src/features/settings-pane/components/settings-search-box.tsx`
- Create: `packages/app-core/src/features/settings-pane/components/settings-empty-state.tsx`
- Create: `packages/app-core/src/features/settings-pane/hooks/use-focus-search-shortcut.ts`
- Create: `packages/app-core/src/features/settings-pane/search/resolve-descriptors.ts`
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`
  (render SearchBox above accordion; run resolver; compute `MatchView`
  once per render via `useMemo`; switch to `effectiveOpenItems` and
  `noop` onToggle during search; branch to empty state when appropriate;
  consume `settingsPanePlatformSearchable` from platform provider)
- Modify: `packages/app-core/src/components/deneb-platform/types.ts`
  (add `settingsPanePlatformSearchable?: PlatformSearchContribution` to
  the provider interface)
- Modify: `packages/app-core/src/i18n/en-US.json` (add
  `Text_Settings_Search_Placeholder`, `Text_Settings_Search_AriaLabel`,
  `Text_Settings_Search_NoMatches`)
- Test: `packages/app-core/src/features/settings-pane/hooks/__tests__/use-focus-search-shortcut.test.ts`
- Test: `packages/app-core/src/features/settings-pane/search/__tests__/resolve-descriptors.test.ts`

**Approach:**
- `resolve-descriptors.ts` exposes pure resolver helpers:
  `resolveSectionSchema(schema, translate)`,
  `resolvePlatformSearchable(contribution, translate)`, and a
  `resolveQuery(raw, locale)` that applies locale-aware lower-casing
  before handing off to the engine.
- `PlatformSearchContribution` type (new, exported from
  `deneb-platform/types.ts`):
  `{ heading: string | I18nKey; rows: { id; label: string | I18nKey; assistive?: string | I18nKey }[] }`
  — platform consumers can supply either raw strings (already
  localised) or translation keys (resolved by the pane). When no
  contribution is supplied, the platform section is treated as
  always-visible (documented fallback, not a silent hole).
- Pane-level flow, once per render:
  1. Subscribe to `query` from the slice.
  2. Run resolver over each registered section schema (general,
     performance), the dataset factory, and the platform contribution.
  3. `const matchView = buildMatchView({ query: resolvedQuery, sections: resolvedSections, dataset: resolvedDataset })`
     inside `useMemo`, keyed on query + resolved-descriptor identities.
  4. `effectiveOpenItems = query === '' ? openItems : [...matchView.matchedSections, ...(platformSearchable ? [] : ['platform'])]`
     (platform section without a descriptor stays always-visible by
     being pushed into the effective open set when not present in
     `matchedSections`).
  5. `effectiveOnToggle = query === '' ? setOpenItems : noop` — chevrons
     are click-suppressed during search.
  6. If `query !== '' && matchView.matchedSections.size === 0 && no always-visible platform section`,
     render `<SettingsEmptyState query={query} />` in place of the
     accordion.
- `settings-search-box.tsx` renders a Fluent `SearchBox` bound to the
  slice's `query` / `setQuery`. Placeholder + aria-label via
  `translate()`. Clear button uses Fluent's native `onChange` with
  `data.value === ''`. `Escape` is handled by Fluent natively.
- `use-focus-search-shortcut.ts`: `useHotkeys('/', handler, options)`
  (from `react-hotkeys-hook`). **Use dedicated options, NOT the shared
  `HOTKEY_OPTIONS` from `packages/app-core/src/lib/commands/constants.ts`** —
  `HOTKEY_OPTIONS` sets `enableOnFormTags: ['INPUT','SELECT','TEXTAREA']`
  (Deneb's editor hotkeys fire inside form tags by design). The `/`
  shortcut needs the opposite: `enableOnFormTags: false` +
  `enableOnContentEditable: false`. The handler: if `document.activeElement`
  matches `input, textarea, [contenteditable="true"]` or is inside a
  `.monaco-editor` subtree, bail out **without calling `preventDefault`**
  so the `/` keystroke passes through to the focused surface (including
  the SearchBox itself when it already has focus — users searching
  paths like `dataset/columns` must be able to type `/`). Otherwise
  focus the SearchBox via a ref threaded from the pane and
  `preventDefault` to swallow the triggering keystroke.
- `settings-empty-state.tsx`: centred short text from
  `Text_Settings_Search_NoMatches`, interpolated with the current query.
  Uses a status role for screen readers.
- **Focus recovery when the focused row disappears:** if the active
  element is inside a row that becomes hidden by a new keystroke, move
  focus back to the SearchBox (a `useLayoutEffect` keyed on the next
  `MatchView` compares the active element's row ancestry against the
  computed visibility). The SearchBox retains focus in the empty-state
  branch regardless. No other focus heuristic is applied — keeping the
  caret in the SearchBox matches users' typing flow.
- `settings-pane.tsx` top-level change:
  - Subscribe to `query`, `openItems` from the slice.
  - Compute `MatchView` once per render via `useMemo` keyed on
    `(query, locale, dataset fields, applicable-flag inputs)`.
  - Compute `effectiveOpenItems` = `query === '' ? openItems : [...MatchView.matchedSections]`.
  - If `query !== '' && matchedSections.size === 0`, render
    `<SettingsEmptyState query={query} />` instead of the accordion.

**Patterns to follow:**
- `use-editor-hotkeys.ts` for `react-hotkeys-hook` usage.
- `SettingsPaneTooltipProvider` pattern for pane-scoped providers (the
  match-view context from Unit 4 will attach here too).

**Test scenarios:**
- Happy path — `/` pressed while focus is on document body: focus moves
  to the SearchBox; `/` is not typed.
- Happy path — `/` pressed while focus is in a `<textarea>`: no focus
  move; the `/` character is typed normally.
- Happy path — `/` pressed while focus is inside a Monaco editor
  (ancestor has class `monaco-editor`): no focus move; `/` types.
- Happy path — `/` pressed while focus is already on the SearchBox
  itself: `/` is typed into the search query; no `preventDefault` is
  called on bail-out path so the character passes through.
- Edge case — `/` pressed while focus is on a `[contenteditable="true"]`
  element: no focus move.
- Edge case — `/` pressed when the pane is not mounted in the DOM: no
  throw; hook is a no-op.
- Happy path (resolver) — A `SectionSchema` with two rows resolves into
  a `ResolvedSectionDescriptor` whose `heading`, each row's `label`,
  and each row's `assistive` contain the exact strings `translate`
  returned for each key.
- Edge case (resolver) — Platform contribution with raw strings
  (pre-localised) passes through unchanged; platform contribution with
  i18n keys is resolved via `translate`.
- Edge case (resolver) — Absent `settingsPanePlatformSearchable` yields
  a `null` resolved platform descriptor; pane treats the platform
  section as always-visible.
- Integration — Typing into the SearchBox updates the slice; accordion
  effectively auto-expands matching sections; clearing restores prior
  open state untouched (because `openItems` is never mutated during
  search).
- Integration — Clicking an accordion chevron while a query is active
  does not toggle that section's open state (onToggle is noop).
- Integration — Query with zero matches and no platform contribution
  replaces the accordion with the empty-state component; the SearchBox
  remains focused and populated.
- Integration — Query with zero matches but platform section present
  (no descriptor) keeps the platform section visible; accordion shows
  only that section, no empty state.

**Verification:**
- Typing triggers re-render of the pane with correct
  `effectiveOpenItems`.
- Three new i18n keys present in
  [packages/app-core/src/i18n/en-US.json](packages/app-core/src/i18n/en-US.json).
- Hook test green.

---

- [ ] **Unit 4: Schemas + HighlightText + filter + assistive preview (general + performance)**

**Goal:** Make `GeneralSettings` (Provider / RenderMode / ScaleToZoom)
and `PerformanceSettings` filter-aware: export a static `SectionSchema`
for each; hide rows whose `matchView.rows` entry is not visible; wrap
matched label / assistive surfaces in `HighlightText`; render the new
inline assistive preview when a row matches on assistive-only.

**Requirements:** R2, R3, R9, R10.

**Dependencies:** Unit 1 (engine). No context primitive — the pane
passes `sectionMatchView` as a prop.

**Files:**
- Create: `packages/app-core/src/features/settings-pane/components/highlight-text.tsx`
- Create: `packages/app-core/src/features/settings-pane/components/assistive-preview.tsx`
- Create: `packages/app-core/src/features/settings-pane/search/general-schema.ts`
- Create: `packages/app-core/src/features/settings-pane/search/performance-schema.ts`
- Modify: `packages/app-core/src/features/settings-pane/components/general-settings.tsx`
  (accept `sectionMatchView` prop; filter rows; wrap labels in
  `HighlightText`; render `AssistivePreview` on assistive-only matches)
- Modify: `packages/app-core/src/features/settings-pane/components/performance-settings.tsx`
  (same)
- Modify: `packages/app-core/src/features/settings-pane/components/settings-accordion-item.tsx`
  (accept an optional `highlightedHeading` ReactNode so the pane can
  inject the highlighted heading)
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`
  (pass `sectionMatchView={matchView.rows.get(id)}` to each section
  component; pass `highlightedHeading` to each `SettingsAccordionItem`
  when the heading has match ranges)
- Test: `packages/app-core/src/features/settings-pane/components/__tests__/highlight-text.test.ts`
- Test: `packages/app-core/src/features/settings-pane/components/__tests__/assistive-preview.test.ts`

**Approach:**
- `highlight-text.tsx` exports `<HighlightText text query />`. It calls
  the pure `computeHighlightRanges` from Unit 1, then emits a
  `<span>`/`<mark>` sequence using the tokens from Key Technical
  Decisions (`colorBrandBackground2` + `colorNeutralForeground1`).
  No hooks; no state. Verify WCAG 4.5:1 contrast against
  `colorNeutralBackground2` in both themes as part of verification;
  fall back to `colorBrandBackgroundInverted` + `colorNeutralForegroundOnBrand`
  if contrast fails.
- `assistive-preview.tsx` exports `<AssistivePreview text query />`.
  Renders a small caption-sized line with `HighlightText` wrapping the
  matched substring context. Uses Fluent's `Caption1` type ramp and
  `colorNeutralForeground3` for the surrounding context (so the
  highlight pops).
- Each schema file exports `const { heading, rows } satisfies SectionSchema`
  — listing every row the section renders along with its `labelKey`
  and optional `assistiveKey`. Row ids are stable strings owned by the
  schema, referenced by the section component to decide visibility.
- **No React context.** Pane passes `sectionMatchView` as a prop to each
  section component (typed `SectionMatchView | null` where `null`
  denotes "all visible" / query empty).
- Each section component:
  - Maps through the schema; renders a row only if
    `sectionMatchView === null || sectionMatchView.rows.get(rowId)?.visible !== false`.
  - Replaces plain `translate(labelKey)` with
    `<HighlightText text={translate(labelKey)} ranges={…} />` when the
    row has `highlights.label`.
  - Renders `<AssistivePreview …/>` below the label when the row has
    `highlights.assistive` but no `highlights.label` (assistive-only
    match).

**Patterns to follow:**
- Style / layout patterns from existing general-settings and
  performance-settings components (Field / Switch / Radio / SpinButton).
- Schema-as-const pattern from
  [packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts](packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts)
  (`MEASURE_FLAGS as const`).

**Test scenarios:**
- Happy path (HighlightText) — Single match: text "Format string" with
  query "format" renders the `<mark>` covering the first 6 characters
  and plain text afterwards.
- Happy path (HighlightText) — No match: renders the text unchanged,
  no `<mark>` elements.
- Happy path (HighlightText) — Multiple matches: text "Row threshold for
  patching" with query "h" marks every `h` occurrence.
- Edge case (HighlightText) — Empty query renders plain text even if
  text is non-empty.
- Edge case (HighlightText) — Empty text renders nothing (not a stray
  `<mark>`).
- Edge case (HighlightText) — Match at end of string: boundary handling
  covers the final character.
- Happy path (schema) — A visible section renders the same rows as it
  does today when query is empty (sectionMatchView is null → all rows
  visible).
- Happy path (schema) — A query matching only one row in
  `performance-settings` hides sibling rows; the remaining row renders
  with a highlight.
- Happy path (assistive-only) — A query that matches a row's assistive
  text but not its label renders the row with its label unhighlighted
  PLUS an `AssistivePreview` line below the label showing the matched
  substring in context.
- Edge case (schema) — A query matching the `performance` section's
  heading keeps every row visible with no row-level highlights.
- Integration — A schema's row id missing from the match view falls
  back to the "all visible" sentinel when sectionMatchView is null.

**Verification:**
- Empty-query behaviour of both sections is byte-for-byte unchanged.
- A handful of canary queries (e.g. "provider", "threshold", "render")
  hide/show the expected rows and highlight the expected label text.

---

- [ ] **Unit 5: Dataset dynamic indexer + tree filter + highlight + assistive preview + benchmark gate**

**Goal:** Contribute the Dataset section's dynamic `ResolvedDatasetDescriptor`
into the match engine, apply the R4 tree-filter rule inside the existing
[packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx)
component so fields and flags hide/show per the rule, highlight matched
surfaces, render the inline assistive preview for assistive-only flag
matches, and pass a benchmark gate at scale.

**Requirements:** R2, R3, R4, R9, R10.

**Dependencies:** Unit 1, Unit 2, Unit 3, Unit 4 (HighlightText +
AssistivePreview).

**Files:**
- Create: `packages/app-core/src/features/settings-pane/search/dataset-indexer.ts`
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`
- Test: `packages/app-core/src/features/settings-pane/search/__tests__/dataset-indexer.test.ts`
- Create: `packages/app-core/src/features/settings-pane/search/__bench__/dataset-search.bench.ts`
- Modify: `benchmarks/baselines/app-core.json` (add a baseline entry
  for the new bench, following the existing benchmark convention)

**Approach:**
- `dataset-indexer.ts` exports
  `buildResolvedDatasetDescriptor({ sourceFields, resolvedFlags, consolidateFieldParameters, highlightEnabled, translate, FLAG_LABELS, FLAG_INFO })`
  returning `ResolvedDatasetDescriptor`. It walks each source field,
  derives its `applicableFlags` via the existing `getApplicableFlags`,
  and pre-resolves each flag's `label` + `assistive` via `translate`
  so the engine stays string-frozen. Pure function.
- The pane (Unit 3) calls this during its resolver step, inside the
  same `useMemo` keyed on
  `(query, sourceFields, resolvedFlags, consolidateFieldParameters, highlightEnabled, locale)`
  so descriptor identity is stable across renders that don't change any
  of those.
- Inside `dataset-settings.tsx`:
  - Accept a new `datasetMatchView: DatasetMatchView | null` prop.
  - When `datasetMatchView === null` (empty query), render today's
    pane unchanged.
  - When non-null, walk `datasetMatchView.matchedFields`: render only
    listed fields; within each, render only `visibleFlags`. If a
    field's `matchReason === 'field-name'`, render all applicable
    flags (existing `getApplicableFlags` output). MessageBars, role
    icon, Reset button, and enabled-flag hint dot remain visible per
    R4.
  - Wrap `{name}` in `<HighlightText>` using `highlights.field` when
    present.
  - Wrap each flag's label in `<HighlightText>` using
    `highlights.flags.get(flagKey)?.label` when present.
  - Render `<AssistivePreview>` below the flag label when
    `highlights.flags.get(flagKey)` has `assistive` ranges but no
    `label` ranges (assistive-only match).

**Benchmark gate (merge-blocking for this unit):**
- `dataset-search.bench.ts` synthesises a dataset of 1,000 source
  fields × 7 applicable flags, constructs the
  `ResolvedDatasetDescriptor` once, then runs `buildMatchView` with a
  variety of queries (1-char, 4-char label match, field-name match,
  no-match).
- Budget: **p95 keystroke-to-match < 50ms per call** measured on the
  CI benchmark runner. If the budget is exceeded, the unit does not
  merge; options in that case are (a) debounce `setQuery`, (b) pre-index
  lower-cased strings at descriptor build time, (c) batched visibility
  updates. Decide at measurement time based on where the cost lives.

**Patterns to follow:**
- Existing traversal inside `dataset-settings.tsx` (fieldFlags hoist,
  `applicableFlags`, `TreeItem value={…}` convention).
- `getApplicableFlags` / `MEASURE_FLAGS` / `COLUMN_FLAGS` already pure
  and testable.

**Test scenarios:**
- Happy path — Query matching a field name returns that field with
  `matchReason: 'field-name'` and every applicable flag in
  `visibleFlags`.
- Happy path — Query matching a flag label (e.g. "highlight") against
  a dataset with two measures and one column returns both measures
  with `visibleFlags` containing only the highlight-related flags, and
  excludes the column.
- Happy path — Query matching a flag's assistive text only still
  exposes that flag with highlight ranges pointing at the assistive
  surface (the info preview), not the label.
- Edge case — Query matches both a field name and a flag on a
  different field: first field contributes with all its flags, second
  field contributes with only the matching flag.
- Edge case — `consolidateFieldParameters === false`: `names` and
  `treatAsParameter` are not in any field's applicable flags and
  therefore cannot match.
- Edge case — `consolidateFieldParameters === true` but the field is a
  non-parameter column: `treatAsParameter` IS applicable (and indexable)
  while `names` is not.
- Edge case — Field parameter field with `treatAsParameter === true`:
  `names` IS in its applicable flags.
- Edge case — Field whose name contains `/` (our TreeItem value
  separator) matches correctly against queries that include `/`.
- Edge case — Dataset with zero source fields: descriptor carries the
  heading key only; query against a field name returns no dataset-tree
  matches.
- Edge case — Applicable flags change mid-search because the user
  toggled cross-highlight: next render returns a fresh descriptor; the
  dataset tree updates.
- Integration — Rendering the full `DatasetSettings` with query "Sales"
  against a synthetic dataset containing "Sales Amount" and "Revenue"
  leaves the Sales field expanded with all flags; hides Revenue;
  MessageBars remain rendered alongside.

**Verification:**
- Query-empty render of Dataset section is byte-for-byte unchanged.
- The existing `computeToggledConfig`, `hasAnyEnabledFlag`,
  `removeFieldFromConfig` helpers are untouched — search is strictly
  additive.

---

- [ ] **Unit 6: Right-click context menu + keyboard equivalent (callback-driven)**

**Goal:** Add the right-click context menu anywhere inside the settings
pane with "Expand all categories" and "Collapse all categories" entries,
filter-aware per R5, with a `Shift+F10` / Menu key equivalent for
keyboard users. The menu mutates the pane's local `openItems` via
callback props; it does **not** read or write the Zustand slice.

**Requirements:** R5, R8.

**Dependencies:** Unit 1 (engine), Unit 3 (pane owns `openItems` local
state and computes visibleSectionIds from `matchView`).

**Files:**
- Create: `packages/app-core/src/features/settings-pane/components/settings-pane-context-menu.tsx`
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`
  (mount the context menu at pane root; `onContextMenu` handler;
  keyboard listener scoped to the pane root ref; wire `onExpandAll`
  and `onCollapseAll` callbacks that mutate the local `openItems`)
- Modify: `packages/app-core/src/i18n/en-US.json` (add
  `Text_Settings_ExpandAll`, `Text_Settings_CollapseAll`)

**Approach:**
- `settings-pane-context-menu.tsx` exports
  `<SettingsPaneContextMenu open anchorRect onOpenChange onExpandAll onCollapseAll translate />`.
  Props only — no store reads inside the component.
- A controlled Fluent `<Menu open positioning={...}>` with
  `MenuPopover`, `MenuList`, and two `MenuItem`s. Positioning uses a
  virtual element whose `getBoundingClientRect` returns the saved
  `anchorRect` (viewport coords).
- Pane root attaches `onContextMenu`: `preventDefault` (scoped to pane
  DOM subtree; portaled popovers are not intercepted — documented),
  capture `event.clientX/Y` as a 1×1 `anchorRect`, call
  `onOpenChange(true)` on the menu.
- Pane root attaches `onKeyDown`: if `Shift+F10` or `ContextMenu`, open
  the menu anchored to `document.activeElement.getBoundingClientRect()`.
- Menu item handlers call the pane-supplied callbacks:
  - `onExpandAll()` in the pane reads the current `matchView` +
    `query` and sets local `openItems` to
    `query === '' ? ALL_SECTION_IDS_INCLUDING_PLATFORM : [...matchView.matchedSections, ...(platformContribution ? [] : ['platform'])]`.
  - `onCollapseAll()` in the pane sets local `openItems` to `[]`.
- Menu closes on item select, `Escape`, or focus loss (Fluent's default).

**Patterns to follow:**
- Fluent UI 9 `Menu` docs (no existing local precedent in `app-core`;
  this is a net-new primitive — confirm menu positioning coords land
  relative to the viewport not the pane).

**Test scenarios:**
- Happy path — Right-click inside the pane opens the menu at the
  cursor; native browser context menu does not appear.
- Happy path — `Shift+F10` while focus is in the pane opens the menu
  anchored at the focused element.
- Happy path — "Expand all" with no query opens every top-level
  section (`openItems === ['general','performance','dataset']` plus any
  platform-injected section).
- Happy path — "Collapse all" with no query leaves `openItems` empty.
- Edge case — "Expand all" while query is non-empty opens only the
  matching sections (filter-aware per R5).
- Edge case — Right-click outside the pane bounds does not open the
  menu and does not suppress the native context menu.
- Edge case — Menu item activation via Enter key behaves identically to
  mouse click.
- Edge case — Platform-injected section (`settingsPanePlatformComponent`)
  — "Expand all" includes it in the open set.
- Integration — Right-click inside the pane while a search is active,
  "Collapse all", then clear the search: `preSearchOpenItems` restores
  the pre-search open state (not the collapsed-during-search state),
  because the user's collapse-during-search is the override pattern
  captured in Unit 2.

**Verification:**
- Browser context menu is suppressed only while the event target is
  inside the pane's root element.
- Two new i18n keys present.
- Existing accordion open/close interaction (click the chevron) is
  unchanged.

## System-Wide Impact

- **Interaction graph:** The settings pane gains three new input paths —
  SearchBox, right-click/keyboard context menu, and the `/` hotkey.
  Each funnels through slice actions in Unit 2, so there's exactly one
  mutation seam per state change.
- **Error propagation:** The match engine is pure and never throws for
  legitimate inputs; the render layers defensively treat a missing
  match-view entry as "visible" so a partially-computed view can't
  blank the pane.
- **State lifecycle risks:** Moving `persistedOpenItems` from a module
  ref into the store is the only behavioural migration. Keep the same
  effective semantics (in-memory, not persisted across reloads) and
  verify open-state survives pane close / reopen within a session.
- **API surface parity:** None — the slice is internal. Platform
  consumers injecting `settingsPanePlatformComponent` continue to work
  because we include any rendered section id in "Expand all".
- **Integration coverage:** Unit 3 and Unit 5 carry cross-layer
  scenarios the unit tests alone won't prove — specifically, a real
  render pass with SearchBox → slice → match engine → per-section
  filter → DOM. These are captured as integration scenarios inside
  their respective Unit's `Test scenarios`.
- **Unchanged invariants:** `SupportFieldConfiguration` persisted
  shape, `stateManagement` persisted state, project-persistence
  lifecycle, Tree expand/collapse keyboarding, cross-highlight
  `MessageBar` wiring, `i18n` locale fallback behaviour — none
  change.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `/` shortcut focus-guard misses a text-entry surface (Monaco, a new input, a third-party embed). | Guard by both element tag (`input`/`textarea`/`contenteditable`) and ancestor class (`.monaco-editor`); `preventDefault` only runs on the focus-move path, so missed surfaces degrade gracefully — `/` types through instead of silently disappearing. Hook test covers each surface. |
| Rendering cost scales with dataset field count × flag count on every keystroke. | Engine is genuinely pure over frozen descriptors and memoised on descriptor identity. Unit 5 carries a **benchmark gate**: p95 keystroke-to-match < 50ms at 1,000 fields × 7 flags; merge-blocking. If the gate fails, mitigation is pre-indexed lower-cased strings at descriptor build time + possible debounce. |
| Context menu `preventDefault` suppresses native "Inspect element" when right-clicking the pane's own DOM subtree. | Accepted per R5; documented. Portaled popovers (InfoLabel, Tooltip) bypass the suppression because they mount to `document.body`. |
| Read-only chevrons during search might confuse users who expect click to work. | Low-severity UX concern; cursor remains pointer but click is no-op. Users who want to manually toggle clear the query first. Evaluate during QA; if confusing, add a subtle visual disabled state for chevrons during search. |
| Platform section is always-visible when no descriptor is supplied — a silent hole if platform consumers assume their section filters like others. | Documented explicitly in the provider interface JSDoc; `settingsPanePlatformSearchable` opt-in makes participation a conscious choice. |
| Existing i18n keys are referenced case-sensitively by many call sites; adding 5 keys is low-risk but regression potential in key typos is real. | Test suites in Units 3 and 6 assert each new key exists; `project-standards` review catches drift. |
| Context-menu keyboard shortcut `Shift+F10` collides with Power BI host or with Monaco's built-in menu. | Shift+F10 is a standard W3C menu shortcut and Monaco binds it only when Monaco holds focus. Verify during QA: (a) `Shift+F10` inside the pane (non-Monaco focus) opens ours; (b) `Shift+F10` inside a Monaco editor opens Monaco's; (c) `Shift+F10` elsewhere in Power BI Desktop doesn't double-fire. Fallback if any collision: `ContextMenu` key only. |
| The resolver runs `translate` × (rows × surfaces) on every pane render — a hot path if sections grow. | Resolver is gated behind the same `useMemo` as `buildMatchView`, keyed on locale + schema identities + dataset inputs. Measure alongside Unit 5's benchmark; cache resolved descriptors if needed. |

## Documentation / Operational Notes

- Add a short note in the Deneb end-user documentation for the next
  release mentioning the new search and right-click affordances.
- No operational (rollout / monitoring) concerns — client-side UI only.
- **Follow-up: localised translations** for the five new i18n keys into
  the 40+ locales under `stringResources/*/resources.resjson` and
  matching app-core locale files. Out of scope for this plan; create a
  follow-up task after the feature lands.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-23-settings-pane-search-requirements.md](docs/brainstorms/2026-04-23-settings-pane-search-requirements.md)
- Pane entry point: [packages/app-core/src/features/settings-pane/components/settings-pane.tsx](packages/app-core/src/features/settings-pane/components/settings-pane.tsx)
- Accordion wrapper: [packages/app-core/src/features/settings-pane/components/settings-accordion-item.tsx](packages/app-core/src/features/settings-pane/components/settings-accordion-item.tsx)
- Existing Dataset tree: [packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx)
- Store composition: [packages/app-core/src/state/state.ts](packages/app-core/src/state/state.ts)
- Existing hotkey pattern: [packages/app-core/src/app/editor/hooks/use-editor-hotkeys.ts](packages/app-core/src/app/editor/hooks/use-editor-hotkeys.ts)
- i18n catalog: [packages/app-core/src/i18n/en-US.json](packages/app-core/src/i18n/en-US.json)
- Institutional learning — pure setState updaters: [docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md)
- Institutional learning — type widening: [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md)
- Institutional learning (post-implementation, captured from review feedback) — extract shared semantics into pure helpers when parallel index/render paths must agree: [docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md)
