---
title: "fix: Restore keyboard navigation in modal dialogs"
type: fix
status: active
date: 2026-04-10
origin: docs/brainstorms/2026-04-10-modal-dialog-keyboard-nav-requirements.md
---

# fix: Restore keyboard navigation in modal dialogs

## Overview

Fix Tab key navigation in the import (create) and export modal dialogs. Currently, Tab gets trapped on the radio group in the import dialog and loops back to the first field in the export dialog. The fix adds explicit focus zone configuration to the dialog content areas so Tab cycles through all interactive zones in visual order.

## Problem Frame

Keyboard users cannot navigate the import or export dialogs without a mouse. In the import dialog, focus traps on the "Create using..." radio group. In the export dialog, Tab returns to the Name field instead of cycling through all form fields and buttons. This makes these dialogs inaccessible via keyboard. (see origin: `docs/brainstorms/2026-04-10-modal-dialog-keyboard-nav-requirements.md`)

## Requirements Trace

- R1. Tab from radio group must advance to the next interactive zone in the import dialog
- R2. Template list should be a single tab stop with arrow key navigation inside
- R3. Shift+Tab must reverse through focus zones in the import dialog
- R4. Tab must cycle through all interactive elements in visual order in the export dialog (Name → Description → Author → Preview checkbox → buttons)
- R5. Focus must not return to Name after the last field — continue to checkbox and buttons
- R6. Shift+Tab must reverse in the export dialog
- R7. Verify version change dialog keyboard navigation (may already work)
- R8. Focus zones should follow Fluent UI focus management patterns

## Scope Boundaries

- NOT fixing: Remap dialog (no longer displayed)
- NOT fixing: Editor keyboard navigation (already works)
- NOT adding: New keyboard shortcuts within dialogs

## Context & Research

### Relevant Code and Patterns

- `packages/app-core/src/components/ui/modal-dialog/modal-dialog.tsx` — shared Dialog wrapper using Fluent UI v9's `Dialog` component with `modalType` prop
- `packages/app-core/src/features/project-create/components/visual-create-pane.tsx` — import dialog content with conditional rendering based on create mode
- `packages/app-core/src/features/project-create/components/create-method.tsx` — `RadioGroup` with three Radio options
- `packages/app-core/src/features/project-export/components/export-pane.tsx` — export dialog content
- `packages/app-core/src/features/project-export/components/export-information.tsx` — three `CappedTextField` components + one `Checkbox`
- `packages/app-core/src/components/ui/modal-dialog/version-change-content.tsx` — version change dialog
- `packages/app-core/src/components/ui/capped-text-field.tsx` — text field with `Input`/`Textarea` from Fluent UI

### Current State

- **No explicit `tabIndex`, `FocusZone`, or `tabster` usage** anywhere in `packages/app-core/`
- Fluent UI v9's Dialog provides basic focus trapping via `@fluentui/react-tabster` (bundled internally), but no focus zone configuration is applied to dialog content
- The conditional content rendering in the import dialog (template list appears/disappears based on radio selection) likely disrupts Fluent UI's automatic focus order
- The export dialog's focus looping suggests Fluent UI's focus trap is wrapping around to the first focusable element instead of reaching the checkbox and buttons (possibly because they are in `DialogActions`, which is a separate child of `DialogBody`)

## Key Technical Decisions

- **Use Fluent UI v9's `tabster` attributes over custom `tabIndex` management:** Fluent UI v9 uses `tabster` under the hood for focus management. The `useFocusableGroup` hook and `data-tabster` attributes provide focus zone behavior that integrates with the existing Dialog focus trap. This is more maintainable than manual `tabIndex` values.
- **Fix at the dialog content level, not the shared Dialog wrapper:** The focus issues are specific to how content is structured within each dialog, not a bug in the Dialog wrapper itself. Fixes should be in the feature-specific pane components.

## Open Questions

### Resolved During Planning

- **Q: Does Fluent UI v9 expose focus zone primitives?** → Yes, `@fluentui/react-tabster` exports `useFocusableGroup` and `useArrowNavigationGroup` hooks. The Dialog component already depends on this package internally.
- **Q: Why does the export dialog loop to the first field?** → Likely because the `CappedTextField` components use Fluent `Input` which participates in the focus trap, but the `Checkbox` and `DialogActions` buttons may be outside the tabster-managed focus scope or in a separate DOM subtree that the focus trap skips.

### Deferred to Implementation

- **Exact `tabster` configuration needed for the template list arrow navigation:** Depends on how `SelectIncludedTemplate` renders its list items — may need `useArrowNavigationGroup` or a `role="listbox"` pattern.
- **Whether the version change dialog needs changes:** Needs manual testing in the browser during implementation.

## Implementation Units

- [ ] **Unit 1: Fix export dialog tab order**

**Goal:** Make Tab cycle through all interactive elements in the export dialog: Name → Description → Author → Preview checkbox → action buttons.

**Requirements:** R4, R5, R6

**Dependencies:** None

**Files:**
- Modify: `packages/app-core/src/features/project-export/components/export-pane.tsx`
- Modify: `packages/app-core/src/features/project-export/components/export-information.tsx`

**Approach:**
- Investigate why the Checkbox and DialogActions buttons are unreachable by Tab. The most likely cause is a DOM structure issue where these elements are outside the focus trap's effective scope.
- If the issue is `DialogActions` being in a separate focus scope from `DialogContent`, the fix may involve restructuring how the content and actions relate within the `DialogBody`, or adding explicit `tabIndex={0}` to the unreachable elements.
- If `CappedTextField` is capturing Tab (e.g., via the underlying `Input` or `Textarea`), check whether Fluent UI's `Input` component has a default behavior that prevents Tab from leaving.

**Patterns to follow:**
- Fluent UI v9 Dialog documentation for focus management
- Existing `CappedTextField` props — check if any prop affects focus behavior

**Test scenarios:**
- Happy path: Tab from Name field → focus moves to Description → Author → Preview checkbox → Download button → Copy button → Close button → wraps to Name
- Happy path: Shift+Tab reverses the above sequence
- Edge case: Tab behavior when "Include Preview Image" checkbox is unchecked (preview image area hidden — should not affect tab order)

**Verification:**
- All interactive elements in the export dialog are reachable via Tab
- Tab order matches visual layout
- Shift+Tab reverses correctly

---

- [ ] **Unit 2: Fix import dialog tab navigation from radio group**

**Goal:** Make Tab advance from the "Create using..." radio group to the content area (template list or spec editor) and then to the Create button.

**Requirements:** R1, R2, R3, R8

**Dependencies:** None (can be done in parallel with Unit 1)

**Files:**
- Modify: `packages/app-core/src/features/project-create/components/visual-create-pane.tsx`
- Modify: `packages/app-core/src/features/project-create/components/create-method.tsx`

**Approach:**
- The radio group likely traps focus because Fluent UI's `RadioGroup` uses arrow key navigation internally (correct behavior) but Tab isn't advancing to the next focusable element outside the group. Investigate whether the conditional content (template list vs. spec editors) is rendered in a way that makes it unfocusable.
- For the template list (`SelectIncludedTemplate`), configure it as a single tab stop with arrow key navigation between template cards. This may require `useArrowNavigationGroup` from `@fluentui/react-tabster` or a `role="listbox"` pattern with `role="option"` on each card.
- Ensure that when the create mode changes (radio selection changes), the newly rendered content is included in the tab order without requiring a manual focus reset.

**Patterns to follow:**
- Fluent UI v9 RadioGroup behavior — Tab should exit the group, arrow keys navigate within
- Fluent UI Listbox/ComboBox patterns for the template list focus zone

**Test scenarios:**
- Happy path: Tab from radio group → focus moves to template list (when "Import" is selected)
- Happy path: Tab from radio group → focus moves to Create button (when "Vega" or "Vega-Lite" is selected, if no intermediate focusable content)
- Happy path: Arrow keys navigate between template cards within the template list
- Happy path: Tab from template list → focus moves to Create button
- Happy path: Shift+Tab reverses the full sequence
- Edge case: Switching radio selection while focus is in the template list — focus should move to the newly rendered content or remain in the radio group
- Edge case: Template list is empty (no templates available) — Tab should skip to Create button

**Verification:**
- Tab exits the radio group and reaches the content area
- Template list is one tab stop with arrow keys inside
- Create button is reachable via Tab from any content area

---

- [ ] **Unit 3: Verify and fix version change dialog**

**Goal:** Confirm keyboard navigation works in the version change dialog. Fix if needed, document as working if not.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Possibly modify: `packages/app-core/src/components/ui/modal-dialog/version-change-content.tsx`

**Approach:**
- Manually test Tab navigation in the version change dialog in the browser
- The version change dialog has simpler content (text + buttons) so it may already work correctly with Fluent UI's default focus management
- If it needs fixes, apply the same patterns used in Units 1 and 2

**Test scenarios:**
- Happy path: Tab cycles through all interactive elements in visual order
- Happy path: Shift+Tab reverses

**Verification:**
- All interactive elements reachable via Tab, or documented as already working

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Fluent UI's `tabster` may not be directly accessible without adding a new dependency | `@fluentui/react-tabster` is already bundled as a transitive dependency of the Dialog component. If direct import fails, fall back to explicit `tabIndex` attributes. |
| Conditional content rendering may break focus order when content changes | Test radio selection changes with focus in the content area. May need to reset focus to the radio group when content type changes. |
| Template list arrow navigation may conflict with existing click handlers on template cards | Test both keyboard and mouse selection paths after adding arrow key navigation. |

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-10-modal-dialog-keyboard-nav-requirements.md`
- Modal dialog wrapper: `packages/app-core/src/components/ui/modal-dialog/modal-dialog.tsx`
- Import dialog: `packages/app-core/src/features/project-create/components/`
- Export dialog: `packages/app-core/src/features/project-export/components/`
- Fluent UI v9 Dialog: `@fluentui/react-dialog` (^9.72.6)
