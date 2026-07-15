/**
 * Pure helpers for `settings-pane.tsx`. Extracted so the context-menu
 * interception predicate can be unit-tested in a jsdom environment without
 * rendering the pane.
 */

/** Selector matching the elements whose native browser context menu (cut /
 * copy / paste, spellcheck suggestions, etc.) must be preserved rather than
 * replaced by the pane's custom context menu. */
const EDITABLE_TARGET_SELECTOR = 'input, textarea, [contenteditable="true"]';

/**
 * Whether a context-menu (right-click or Shift+F10 / ContextMenu key)
 * event's target is inside an editable control — the search box `<input>`
 * today, but written generically so any future editable control (e.g. a
 * contenteditable field) is covered without a follow-up fix.
 *
 * `settings-pane.tsx`'s `handleContextMenu` / `handleKeyDown` used to call
 * `preventDefault()` unconditionally on the pane root, which suppressed the
 * browser's native context menu everywhere under the pane — including
 * inside the search box `<input>`, where the native menu is the only way to
 * right-click-paste or reach the OS spellcheck suggestions, and where
 * Shift+F10 is expected to surface the input's own editing menu rather than
 * the pane's section menu (Important #10). Callers should return early
 * (skip `preventDefault()` and the custom menu) when this returns `true`.
 */
export const isEditableEventTarget = (
    target: EventTarget | null | undefined
): boolean =>
    target instanceof Element &&
    target.closest(EDITABLE_TARGET_SELECTOR) !== null;
