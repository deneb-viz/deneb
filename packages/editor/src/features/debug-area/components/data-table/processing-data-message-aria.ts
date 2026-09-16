/**
 * ARIA props for the loading-state container of `ProcessingDataMessage`.
 *
 * Exported as a constant (rather than inlined on the JSX) so the assertion
 * is testable in vitest's node environment without rendering React. The
 * announcement itself is carried by Fluent's `<Spinner label={...}>` already
 * present in the component — adding a separate `role="status"` live region
 * would risk double-reading on NVDA / VoiceOver, so this stays as
 * `aria-busy` only.
 */
export const PROCESSING_DATA_MESSAGE_ARIA_PROPS = {
    'aria-busy': true
} as const;
