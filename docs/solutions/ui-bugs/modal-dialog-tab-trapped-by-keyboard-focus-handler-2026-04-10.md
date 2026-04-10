---
title: Modal dialog Tab navigation trapped by document-level keyboard focus handler
date: 2026-04-10
category: ui-bugs
module: keyboard-focus
problem_type: ui_bug
component: tooling
symptoms:
  - Tab key trapped on first focusable element in modal dialogs (export, import, create)
  - Focus cycles through only 3 elements instead of all dialog controls
  - No visible focus change when pressing Tab in any modal dialog
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - keyboard-navigation
  - tab-focus
  - modal-dialog
  - fluent-ui
  - power-bi
  - focus-trap
  - accessibility
---

# Modal dialog Tab navigation trapped by document-level keyboard focus handler

## Problem

Tab key navigation was completely broken in all modal dialogs (export, import, version change). Focus was trapped on the first focusable element (e.g., the Name text field in the export dialog) and could not reach any other interactive elements — no other text fields, checkboxes, or buttons were reachable via keyboard.

## Symptoms

- Pressing Tab in the export dialog kept focus on the Name field — Description, Author, Checkbox, and buttons were unreachable
- Pressing Tab in the import dialog kept focus trapped on the radio group — template selection was unreachable
- Browser diagnostic showed focus cycling through only 3 elements: a toolbar button (outside dialog), a mystery `<i>` element, and the Name input — repeating endlessly
- All 13 focusable elements inside the dialog were visible and enabled in the DOM, but Tab never reached them

## What Didn't Work

- **Adding `inertTrapFocus` prop to Fluent UI Dialog** — switches from tabster's JavaScript focus trap to the browser's native `inert`-based trap. Same result — the document-level handler intercepted Tab before either mechanism could act.
- **Adding a manual `onKeyDown` / `onKeyDownCapture` Tab handler on DialogSurface** — attempted to programmatically cycle focus through all focusable elements. The document-level handler still fired first and called `preventDefault()`, preventing the event from reaching the dialog.
- **Checking tabster configuration via `data-tabster` attributes** — the modalizer was correctly configured (`isTrapped: true`), and no child elements had interfering tabster configs. The issue was upstream of tabster entirely.

## Solution

The root cause was the `bindTabCycling` method in `src/index.ts`, introduced in PR #601 (keyboard focus support). It adds a **document-level `keydown` listener** that intercepts ALL Tab key events to prevent focus from escaping the custom visual's iframe into other Power BI canvas elements.

When a modal dialog was open, this handler found the dialog's first focusable element, determined it was at a boundary position, and wrapped focus back — calling `event.preventDefault()` before the dialog's own focus management could act.

The fix: skip the wrap-around when a modal dialog is present in the DOM.

```typescript
// src/index.ts — bindTabCycling method
private bindTabCycling() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        // When a modal dialog is open, let the dialog manage its own
        // focus cycling — the document-level wrap-around must not interfere.
        if (document.querySelector('[role="dialog"]')) return;
        if (
            handleTabWrapAround(
                this.#applicationWrapper,
                document.activeElement,
                event.shiftKey
            )
        ) {
            event.preventDefault();
        }
    });
}
```

## Why This Works

The `handleTabWrapAround` function in `src/lib/keyboard-focus.ts` scans `#applicationWrapper` for all tabbable elements and wraps focus when Tab reaches the first or last element. When a dialog is open, the dialog's elements are inside `#applicationWrapper`, so they're included in the tabbable set. But the handler treats them as part of the overall visual's tab cycle, not as a separate focus scope — so it wraps focus back to the visual's first element instead of letting the dialog cycle through its own elements.

By checking for `[role="dialog"]` and returning early, the document-level handler yields to Fluent UI's Dialog focus trap (tabster modalizer), which correctly cycles focus through all elements within the dialog surface.

## Prevention

- When adding document-level keyboard event handlers, check whether a modal dialog is open before intercepting navigation keys (Tab, Escape, arrow keys). Modal dialogs have their own focus management that should take priority.
- The `[role="dialog"]` selector is a reliable way to detect open Fluent UI dialogs.

## Related Issues

- PR #601: feat: add report canvas keyboard focus support (#461)
- Keyboard focus handler: `src/lib/keyboard-focus.ts`
- Visual entry point: `src/index.ts` (`bindTabCycling` method)
- Requirements: `docs/brainstorms/2026-04-10-modal-dialog-keyboard-nav-requirements.md`
- Plan: `docs/plans/2026-04-10-002-fix-modal-dialog-keyboard-nav-plan.md`
