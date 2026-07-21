---
title: 'refactor: Remove field-level "select all" checkbox from dataset settings'
type: refactor
status: active
date: 2026-04-22
---

# refactor: Remove field-level "select all" checkbox from dataset settings

## Overview

The Settings pane's Dataset tree (built on Fluent UI `Tree` with
`selectionMode='multiselect'`) auto-renders a tri-state checkbox on every field
(branch) node. That parent checkbox was designed as a quick way to enable/disable
every applicable support-field flag for a field in one click.

With the later addition of field parameters and the "Treat as field parameter"
option, bulk-toggling all applicable flags at once now does two things users
rarely want at the same time — e.g. toggling `treatAsParameter`/`names` together
with the data flags. The control is now more hindrance than convenience.

Remove the parent (branch-level) checkbox while keeping the existing field
expand/collapse affordance, per-flag leaf checkboxes, role icon, reset button,
and the two cross-highlight `MessageBar`s. Add a subtle "configured" hint on the
field header so users can still tell at a glance which fields have explicit
configuration.

## Problem Frame

- **Today:** Fluent `Tree` with `selectionMode='multiselect'` auto-renders a
  checkbox for every `TreeItem`, including `itemType='branch'` nodes. The
  component's `onCheckedChange` handler has an `isParent` branch that writes all
  `applicableFlags` for the field into `supportFieldConfiguration` in one go.
- **Problem:** The bulk-toggle semantics collide with the field-parameter flags
  (`treatAsParameter`, `names`). Selecting "all" for a field can silently flip
  `treatAsParameter` along with the data flags, which is rarely the intent.
  Clearing "all" removes the explicit parameter tag too.
- **Goal:** Users configure flags one at a time, by checkbox, per field. Expand/
  collapse per field stays. No loss of the existing Reset affordance or the
  two `MessageBar`s for cross-highlight guidance.
- **v2 context:** Deneb v2 hasn't shipped. `supportFieldConfiguration` persists
  only the per-flag record per field — the parent checkbox was purely derived
  UI. No persisted data references "select all". No new migration is required
  for this change; existing v1→v2 migration work in flight is unaffected.

## Requirements Trace

- R1. The top-level (branch) checkbox no longer appears in the Settings pane's
  Dataset tree.
- R2. Each flag leaf continues to show a checkbox that toggles exactly one flag
  on the field's record in `supportFieldConfiguration`.
- R3. Field expand/collapse behavior is unchanged — collapsed by default, same
  keyboard and click affordances.
- R4. Field header still shows role icon + tooltip, field name, and Reset
  button. Reset continues to remove the field's explicit config entry.
- R5. A subtle visual "enabled-flag" hint appears on the field header when any
  applicable support-field flag is currently enabled for the field — including
  resolved defaults. This is deliberately different from the Reset button
  signal (which tracks "has an explicit config record"); the hint's job is to
  tell the user which fields will produce support fields at all.
- R6. The two `MessageBar`s ("cross-highlight disabled" and "no highlight
  fields selected") are unchanged in visibility, copy, and actions.
- R7. No change to the persisted shape of `supportFieldConfiguration`; no new
  migration. Existing records continue to drive per-flag UI exactly as today.
- R8. Unit tests for the encode/decode helpers that only the parent-checkbox
  path needed are removed alongside the helpers themselves.

## Scope Boundaries

- Not changing persisted data shapes. `SupportFieldFlags`,
  `SupportFieldConfiguration`, and `stateManagement.supportFieldConfiguration`
  are unchanged.
- Not re-working default resolution (`resolveFieldDefaults`) or the applicable-
  flags logic (`getApplicableFlags`, `MEASURE_FLAGS`, `COLUMN_FLAGS`).
- Not changing the cross-highlight `MessageBar` wiring or copy.
- Not touching field-parameter/`treatAsParameter`/`names` semantics beyond
  removing the bulk-toggle path that wrote them together with other flags.
- Not replacing Fluent `Tree` with `Accordion` or a bespoke disclosure — keeping
  `Tree` for expand/collapse and ARIA plumbing, just without `selectionMode`.
- Not adding a new quick-toggle UX to replace "select all".

## Context & Research

### Relevant Code and Patterns

- [packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx) —
  the sole component hosting the parent-checkbox behavior. Key locations:
  - `Tree` props at the render root: `selectionMode='multiselect'`,
    `checkedItems`, `onCheckedChange` drive the whole select-all behavior.
  - `checkedItems` `useMemo` (around lines 168–209) computes parent state —
    `map.set(name, true)` or `map.set(name, 'mixed')` — from leaf flags.
  - `onCheckedChange` `useCallback` (212–282) branches on `isParent` to
    bulk-write all applicable flags.
  - Leaf `TreeItem itemType='leaf'` uses `value={encodeValue(name, flag)}` so
    `decodeValue()` can resolve `(fieldName, flag)` in the shared handler.
- [packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts](packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts) —
  `encodeValue`, `decodeValue`, `VALUE_SEPARATOR` exist solely to support the
  `Tree` multiselect handler. The rest of the file (`MEASURE_FLAGS`,
  `COLUMN_FLAGS`, `FLAG_LABELS`, `FLAG_INFO`, `getApplicableFlags`) is still
  needed.
- [packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts](packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts) —
  existing tests cover the encode/decode helpers and flag-shape invariants.
  Encode/decode tests become obsolete; flag-shape tests remain relevant.
- Fluent UI `Tree` behavior:
  - `selectionMode='multiselect'` is what drives auto-rendered checkboxes on
    every `TreeItem`, including branches. Removing it removes all auto-rendered
    checkboxes. Leaves must then render their own control.
  - `itemType='branch'` renders an expand/collapse chevron independent of
    `selectionMode`. `openItems`/`onOpenChange` continue to work unchanged.

### Institutional Learnings

- `supportFieldConfiguration` stores `{ [fieldName]: SupportFieldFlags }`. The
  Reset button uses `name in config` as its canonical "is explicitly
  configured" signal. Re-using the same signal for the new "configured" hint
  keeps the two UI cues consistent.
- `docs/plans/2026-03-28-support-field-ui.md` — original plan documenting the
  parent-checkbox idea. Useful context for the "why it was added" but the plan
  is closed.

### External References

Not applicable — this is a local refactor of a single component using an API
(Fluent UI `Tree`) already used elsewhere in the repo.

## Key Technical Decisions

- **Keep `Tree` with `itemType='branch'`/`'leaf'`, drop `selectionMode`.** The
  branch still owns expand/collapse and keyboard navigation; we only remove the
  checkbox axis. This is the smallest diff that meets the goal and preserves
  today's ARIA and keyboarding.
- **Render a Fluent `<Checkbox>` inside each leaf's `TreeItemLayout`.** The
  label text (or the existing `InfoLabel`) is placed inside/next to the
  checkbox. This keeps a11y labeling tight and removes the need to interpret
  `TreeCheckedChangeData`.
- **Handler becomes per-`(field, flag)`.** A single `toggleFlag(name, flag)`
  callback replaces `onCheckedChange`. No encode/decode round-trip is needed.
- **"Enabled-flag" hint = `applicableFlags.some(flag => resolvedFlags[name]?.[flag] === true)`.**
  Deliberately decoupled from the Reset button's `name in config` signal. The
  hint answers "does this field currently produce any support fields?", which
  is true for resolved defaults too. Reset answers "did the user explicitly
  configure this field?" — still the right signal for enabling Reset. The two
  are allowed to disagree by design. Rendered via existing Fluent tokens as a
  subtle dot; aria-hidden because the information is decorative reinforcement
  of what expanding the field would show.
- **Delete `encodeValue` / `decodeValue` / `VALUE_SEPARATOR` and their tests.**
  Confirmed no other consumers in the repo (grep: only `dataset-settings.tsx`
  and its own test file). Dead code after this refactor.
- **No `SupportFieldConfiguration` schema change.** Persisted records are
  already per-flag-per-field. The parent checkbox never persisted anything of
  its own.
- **No new migration for v1→v2.** Parent state was derived UI only. Existing
  v2 migration work (stamping legacy defaults into `stateManagement`) is
  unaffected.

## Open Questions

### Resolved During Planning

- **Rendering strategy:** Keep `Tree` and branches; render own checkboxes in
  leaves. (User picked this over accordion / flat list / hide-parent-via-CSS.)
- **Group behavior:** Collapsible, collapsed by default — unchanged.
- **Rollup cue on field header:** Subtle "enabled-flag" hint driven by whether
  any applicable flag in `resolvedFlags[name]` is currently true — including
  defaults. Intentionally different from the Reset button's signal.
- **External dependencies (e2e, docs, demos):** None known; no external
  references to a "select all" control. A spot-check is still in scope as part
  of Unit 2.

### Deferred to Implementation

- **Exact visual treatment of the "configured" hint.** A small dot, an accent
  badge, or a `fontWeight` change using existing Fluent tokens — pick during
  implementation to match surrounding pane styling. No new tokens to be
  introduced.
- **Checkbox label wiring inside `InfoLabel`.** Fluent's `InfoLabel` wraps the
  text; the `Checkbox` needs either to host the label itself or have an
  explicit `htmlFor`/`aria-labelledby` against the `InfoLabel` text. Pick the
  shape that keeps screen-reader output sensible while still rendering the
  `info` popover.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for
> review, not implementation specification. The implementing agent should
> treat it as context, not code to reproduce.*

```
Before                              After
------                              -----
<Tree                               <Tree
  selectionMode='multiselect'         openItems / onOpenChange
  checkedItems                        (no selectionMode,
  onCheckedChange                      no checkedItems,
  openItems / onOpenChange>            no onCheckedChange)>
  branch: auto-checkbox + chevron     branch: chevron only
    leaf: auto-checkbox + label         leaf: <Checkbox> + label/InfoLabel
```

Field row (branch header) responsibilities, before vs. after:

| Element        | Before                                   | After                                      |
|----------------|------------------------------------------|--------------------------------------------|
| Chevron        | Fluent `Tree` branch                     | Fluent `Tree` branch (unchanged)           |
| Parent checkbox| Auto-rendered tri-state                  | **Removed**                                |
| Role icon      | Tooltip + icon                           | Tooltip + icon (unchanged)                 |
| Field name     | Plain text                               | Plain text + subtle "configured" hint      |
| Reset button   | Enabled iff `name in config`             | Enabled iff `name in config` (unchanged)   |

Handler flow simplification:

```
onCheckedChange(event, data):         toggleFlag(name, flag)(checked):
  if isParent(data.value):              setConfig({
    for f in applicableFlags:             ...config,
      updatedFlags[f] = checked           [name]: {
    setConfig(...)                          ...resolvedFlags[name],
  else:                                     [flag]: checked
    [n, f] = decode(data.value)           }
    setConfig(                          })
      ...config,
      [n]: { ...current, [f]: checked }
    )
```

## Implementation Units

- [ ] **Unit 1: Drop the branch-level checkbox from the Dataset tree**

**Goal:** Remove the parent checkbox wiring from
[packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx)
while keeping expand/collapse, per-flag leaf checkboxes, role icon, reset
button, and the two `MessageBar`s. Add the subtle "configured" hint on field
headers.

**Requirements:** R1, R2, R3, R4, R5, R6.

**Dependencies:** None.

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`

**Approach:**
- Remove `selectionMode='multiselect'`, `checkedItems`, and `onCheckedChange`
  from the `<Tree>` root. Keep `openItems` / `onOpenChange`.
- Delete the `checkedItems` `useMemo` and the `onCheckedChange` `useCallback`
  entirely. Remove associated type imports: `TreeCheckedChangeData`,
  `TreeCheckedChangeEvent`, and `TreeItemValue` from
  `@fluentui/react-components` (verify `TreeItemValue` still needed by
  `openItems` typing — keep if so).
- Add a single `toggleFlag(name: string, flag: keyof SupportFieldFlags,
  checked: boolean) => void` callback at component scope that writes
  `{ ...config, [name]: { ...resolvedFlags[name], [flag]: checked } }`.
- Inside each leaf `TreeItemLayout`, render a Fluent `<Checkbox>`:
  - `checked` from `resolvedFlags[name][flag]`.
  - `onChange` delegates to `toggleFlag(name, flag, …)`.
  - Label: when `FLAG_INFO[flag]` exists, wrap the label in `InfoLabel` as
    today and attach the checkbox to it via `htmlFor` / generated id so the
    `info` popover still renders alongside a labeled checkbox.
- On the field header `TreeItemLayout`, add a subtle "enabled-flag" hint when
  any applicable flag in `resolvedFlags[name]` is currently true — including
  resolved defaults. Compute `hasEnabledFlags` alongside the existing
  `isExplicitlyConfigured` and the `applicableFlags` list; render a small
  `aria-hidden` accent (dot) next to the field name when truthy. The Reset
  button still uses `isExplicitlyConfigured` — the two signals intentionally
  disagree for fields whose defaults produce support fields. Use existing
  Fluent tokens; no new tokens or i18n keys.
- Remove the now-unused helper imports (`encodeValue`, `decodeValue`,
  `VALUE_SEPARATOR`) from this file.

**Patterns to follow:**
- The existing `isExplicitlyConfigured` calculation and Reset button wiring in
  this component.
- Existing `makeStyles` + `tokens` usage in `useDatasetSettingsStyles` — add
  one or two small class entries for the "configured" hint rather than inline
  styles.
- Tooltip mounting pattern already used for role icon / reset button via
  `useSettingsPaneTooltip()`.

**Test scenarios:**
- Happy path — Toggling a single leaf checkbox (e.g. `format` on a measure
  field) writes `{ ...existing, format: newValue }` into
  `supportFieldConfiguration[fieldName]` and leaves other fields' entries
  untouched.
- Happy path — A field with no existing config entry resolves its current
  flags through `resolveFieldDefaults`; toggling one leaf creates the entry
  with `{ ...resolvedDefaults, [flag]: newValue }`.
- Happy path — Each field row renders the expand/collapse chevron; clicking
  it (or `ArrowRight`/`ArrowLeft`) toggles open/closed state via
  `openItems` / `onOpenChange`, collapsed by default.
- Happy path — Field header row renders role icon tooltip, field name, and
  Reset button exactly as before. No checkbox is rendered on the field row.
- Happy path — "Enabled-flag" hint appears on any field whose resolved flags
  include at least one applicable flag set to true, regardless of whether the
  field has an explicit record in `supportFieldConfiguration`. A measure with
  only resolved defaults and cross-highlight on (so `highlight`/`format`/
  `formatted` default to true) still shows the hint.
- Edge case — Reset on a field with defaults-only flags does not hide the
  hint (nothing was explicitly configured, but the defaults still produce
  support fields). Reset was already disabled for that field.
- Edge case — Reset on an explicitly-configured field whose explicit flags
  happen to equal the resolved defaults removes the explicit record (Reset
  button disables) but the hint remains if the resolved defaults still have
  at least one applicable flag set.
- Edge case — Toggling all applicable flags off for a field hides the hint,
  while the explicit-config record still exists (so Reset stays enabled). The
  two signals deliberately disagree in this state.
- Edge case — Field with `treatAsParameter === true` renders the same
  `applicableFlags` as today (including `names`); per-flag toggles work
  independently; no bulk write of `treatAsParameter` occurs from any UI
  interaction in this component.
- Edge case — With `consolidateFieldParameters === false`, neither
  `treatAsParameter` nor `names` appears as a leaf; the flag set is driven by
  `getApplicableFlags` exactly as today.
- Error path — Attempting to toggle a flag on a field that has since been
  removed from `sourceFields` (stale render) is a no-op and does not write
  a config entry for an unknown field name. (Defensive guard on
  `resolvedFlags[name]` existence.)
- Integration — With cross-highlight disabled and at least one measure
  present, the "cross-highlight disabled" `MessageBar` renders unchanged; its
  "Enable cross-highlight" action calls `onEnableCrossHighlight` exactly as
  today.
- Integration — With cross-highlight enabled and no highlight flags selected
  on any measure, the "no highlight fields" `MessageBar` renders unchanged;
  its "Disable cross-highlight" action calls `onDisableCrossHighlight`.

**Verification:**
- The Settings pane's Dataset accordion renders no checkbox on field header
  rows. Leaf rows render a single checkbox.
- Expand/collapse, role icon tooltip, Reset button, and both `MessageBar`s
  behave exactly as before a refactor.
- `supportFieldConfiguration` after toggling leaves is shaped identically to
  pre-refactor behavior (same per-field records, minus any parent-bulk-write
  artefacts).
- Keyboard: focus moves into the tree, `ArrowDown`/`ArrowUp` walk rows,
  `ArrowRight`/`ArrowLeft` expand/collapse branches, `Space` toggles the
  focused leaf checkbox, `Tab` exits.

- [ ] **Unit 2: Remove dead encode/decode helpers and their tests; spot-check for external references**

**Goal:** Finish the dead-code removal and confirm nothing outside the
component relied on the parent-checkbox UX.

**Requirements:** R8.

**Dependencies:** Unit 1 (so no consumer of the helpers remains).

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts`
- Modify: `packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts`

**Approach:**
- Delete `VALUE_SEPARATOR`, `encodeValue`, and `decodeValue` from
  `dataset-settings-utils.ts`. Leave `MEASURE_FLAGS`, `COLUMN_FLAGS`,
  `FLAG_LABELS`, `FLAG_INFO`, and `getApplicableFlags` intact.
- In the test file, delete the three `describe` blocks covering encode/decode
  round-trip, ambiguous separators, and any imports those tests relied on
  (`encodeValue`, `decodeValue`, `VALUE_SEPARATOR`). Keep the `flag
  applicability`, `FLAG_LABELS coverage`, and `FLAG_INFO coverage` suites —
  they still describe useful invariants.
- Spot-check repo-wide for references to the parent checkbox: grep for
  `"select all"`, `selectAll`, `TreeCheckedChange`, `VALUE_SEPARATOR`, the
  field-level aria-label in `en-US.json`, and any Playwright/spec/docs files
  mentioning "dataset settings" or "supporting fields" tree interactions.
  Report findings in the PR description; adjust only if something genuinely
  referenced the removed control.

**Patterns to follow:**
- Existing `dataset-settings-utils.ts` export style (named `const`s, single
  exported helper function).
- Existing test file's `describe`/`it` grouping and `expect` style.

**Test scenarios:**
- Happy path — `dataset-settings-utils.ts` exports `MEASURE_FLAGS`,
  `COLUMN_FLAGS`, `FLAG_LABELS`, `FLAG_INFO`, `getApplicableFlags` and nothing
  else. (Verified by the remaining tests' imports compiling, and optionally a
  narrow "public surface" test if the team prefers; not strictly required.)
- Happy path — Remaining `flag applicability` / `FLAG_LABELS coverage` /
  `FLAG_INFO coverage` suites pass untouched.
- Edge case — Project-wide `tsc --noEmit` has no references to the removed
  identifiers in any workspace package.
- Test expectation — The encode/decode describe blocks are gone; no
  replacement tests are added (the removed helpers have no replacement).

**Verification:**
- `npm run test -w @deneb-viz/app-core` passes.
- `npx tsc --noEmit` (root) passes, confirming no dangling imports.
- Repo-wide grep for `VALUE_SEPARATOR`, `encodeValue`, `decodeValue`,
  `TreeCheckedChange`, `selectionMode='multiselect'` returns no hits in
  `packages/app-core/src`.

## System-Wide Impact

- **Interaction graph:** Only the Dataset accordion item in the Settings pane
  is affected. `useDenebPlatformProvider`'s `onEnableCrossHighlight` /
  `onDisableCrossHighlight` callbacks are still wired via the unchanged
  `MessageBar`s.
- **Error propagation:** No changes. Handler writes go through the existing
  `setConfig` slice path.
- **State lifecycle risks:** None. Parent state was purely derived for UI;
  removing the derivation removes no persisted data. Existing records in
  `supportFieldConfiguration` continue to drive per-flag rendering.
- **API surface parity:** Local component surface only. Props exposed by
  `DatasetSettings` are unchanged (the component is consumed through the
  Settings pane; its behavior contract becomes *weaker* by removing a control,
  not breaking consumers).
- **Integration coverage:** Manual smoke in Power BI desktop after the diff
  lands — confirm the Dataset pane, expand/collapse, reset, and cross-
  highlight `MessageBar` flows all behave. Unit tests alone will not exercise
  the Fluent `Tree` DOM; rely on a short manual QA pass.
- **Unchanged invariants:** `SupportFieldFlags`, `SupportFieldConfiguration`,
  `stateManagement.supportFieldConfiguration`, `resolveFieldDefaults`,
  `getApplicableFlags`, `MEASURE_FLAGS`, `COLUMN_FLAGS`, `FLAG_LABELS`,
  `FLAG_INFO`, and all v1→v2 migration logic are untouched by this refactor.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Users who had learned the "select all" behavior lose a shortcut. | Acceptable given v2 hasn't shipped and the control's value has already degraded. Ship note in changelog when v2 lands. |
| Visual regression in the Dataset pane (checkbox alignment, spacing, focus outlines) when swapping Fluent's auto-rendered leaf checkbox for a hand-placed `<Checkbox>`. | Match existing `TreeItemLayout` token usage and `makeStyles` patterns; include a manual QA step in Power BI desktop. |
| Accessibility regression (screen-reader announcement of leaf row changes from "tree item, checked/unchecked" to the new layout). | Attach the `<Checkbox>` to an `htmlFor`/`id` pair or let `InfoLabel` provide the label text. Verify with a screen reader manually as part of QA. |
| `TreeItem itemType='branch'` without `selectionMode` still exposes some tri-state ARIA attribute. | Quick check after implementation: if Fluent still sets `aria-checked` on the branch, either override it via `aria-*` props or hide it via role where needed. Treat as a small follow-up if it surfaces. |
| Dead-code removal misses a consumer. | Unit 2 scope includes a repo-wide grep and type-check. |

## Documentation / Operational Notes

- Add a single line to the v2 release notes / changelog when v2 ships:
  "Removed per-field 'select all' shortcut from Dataset settings; each support
  field flag is now toggled individually."
- No runbook or rollout considerations — the Settings pane is client-side and
  stateless aside from `supportFieldConfiguration`, which is unchanged.

## Sources & References

- Code: [packages/app-core/src/features/settings-pane/components/dataset-settings.tsx](packages/app-core/src/features/settings-pane/components/dataset-settings.tsx)
- Code: [packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts](packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts)
- Tests: [packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts](packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts)
- Historical plan (closed): [docs/plans/2026-03-28-support-field-ui.md](docs/plans/2026-03-28-support-field-ui.md)
- Support-field API docs: [packages/data-core/doc/support-fields.md](packages/data-core/doc/support-fields.md)
