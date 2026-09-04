/**
 * CSS selector for elements that participate in the natural tab order.
 * Covers standard interactive HTML elements (excluding disabled and tabindex="-1")
 * and any element explicitly made tabbable via tabindex="0".
 */
export const TABBABLE_SELECTOR =
    'input:not([disabled]):not([tabindex="-1"]), ' +
    'select:not([disabled]):not([tabindex="-1"]), ' +
    'textarea:not([disabled]):not([tabindex="-1"]), ' +
    'button:not([disabled]):not([tabindex="-1"]), ' +
    'a[href]:not([tabindex="-1"]), ' +
    '[tabindex="0"]';

/**
 * CSS selector for overlay containers that manage their own focus cycling
 * and must therefore pre-empt the document-level Tab wrap-around handler.
 *
 * - `[role="dialog"]`, `[role="alertdialog"]` — Fluent UI Dialog / AlertDialog
 * - `.fui-PopoverSurface` — Fluent UI v9 PopoverSurface (renders with
 *   `role="note"`, so role-based detection alone misses it)
 */
export const FOCUS_YIELD_SELECTOR =
    '[role="dialog"], [role="alertdialog"], .fui-PopoverSurface';

/**
 * Determine whether the document-level Tab handler should yield control to an
 * overlay that manages its own focus (e.g. a Fluent UI Dialog or Popover).
 * When an overlay matching {@link FOCUS_YIELD_SELECTOR} is present in the
 * document, the overlay's own focus-trap / focus management takes priority and
 * the caller should return early without wrapping focus.
 */
export const shouldYieldToFocusScope = (doc: Document = document): boolean =>
    doc.querySelector(FOCUS_YIELD_SELECTOR) !== null;

/**
 * Get all tabbable elements within a container, in DOM order.
 */
export const getTabbableElements = (container: HTMLElement): HTMLElement[] => [
    ...container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)
];

/**
 * Handle Tab/Shift+Tab wrap-around within a container's tabbable elements.
 * Returns `true` if the event was handled (wrapped), `false` if the caller
 * should let the browser handle it.
 *
 * When the active element is the last tabbable element and Tab is pressed,
 * focus wraps to the first. When the active element is the first and
 * Shift+Tab is pressed, focus wraps to the last. If the active element is
 * outside the tabbable set, focus is directed to the first (Tab) or last
 * (Shift+Tab) element.
 */
export const handleTabWrapAround = (
    container: HTMLElement,
    activeElement: Element | null,
    shiftKey: boolean
): boolean => {
    const tabbable = getTabbableElements(container);
    if (tabbable.length === 0) return false;

    const first = tabbable[0];
    const last = tabbable[tabbable.length - 1];
    const isInsideTabbable = tabbable.includes(activeElement as HTMLElement);

    if (shiftKey) {
        if (!isInsideTabbable || activeElement === first) {
            last.focus({ preventScroll: true });
            return true;
        }
    } else {
        if (!isInsideTabbable || activeElement === last) {
            first.focus({ preventScroll: true });
            return true;
        }
    }

    return false;
};
