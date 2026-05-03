/**
 * Pure retention-state computation shared between
 * `<RetainedDenebEditor />` and its tests.
 *
 * Lives in a separate file from the component so the test file does
 * not transitively pull in Monaco (which needs a browser `window`).
 *
 * Returns two values:
 *   - shouldRender: whether `<DenebEditor />` should be in the DOM at all
 *   - isVisible:    whether it should be `display: flex` (else `display: none`)
 *
 * The shouldRender output also encodes the latch: the helper reports
 * `shouldRender = true` from the first call where `isEditorMode` is
 * true onwards, even when the caller has already retained that state
 * via its own `useState`. The component manages the actual latch via
 * `useState` for concurrent-mode safety; this helper is the pure
 * decision function.
 */
export const computeRetentionState = (
    hasOpenedOnce: boolean,
    isEditorMode: boolean
): {
    shouldRender: boolean;
    isVisible: boolean;
} => ({
    shouldRender: hasOpenedOnce || isEditorMode,
    isVisible: isEditorMode
});
