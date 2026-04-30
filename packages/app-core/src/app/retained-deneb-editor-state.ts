/**
 * Pure retention-state computation shared between
 * `<RetainedDenebEditor />` and its tests.
 *
 * Lives in a separate file from the component so the test file does
 * not transitively pull in Monaco (which needs a browser `window`).
 *
 * Returns three values:
 *   - shouldRender:      whether `<DenebEditor />` should be in the DOM at all
 *   - isVisible:         whether it should be `display: flex` (else `display: none`)
 *   - nextHasOpenedOnce: the new value of the sticky latch
 *
 * The latch is monotonic — it only ever flips from `false` to `true`,
 * the first time the visual enters editor mode. Once flipped it stays
 * true so the editor subtree is preserved across viewer↔editor toggles
 * for the rest of the visual's lifetime.
 */
export const computeRetentionState = (
    hasOpenedOnce: boolean,
    isEditorMode: boolean
): {
    shouldRender: boolean;
    isVisible: boolean;
    nextHasOpenedOnce: boolean;
} => {
    const nextHasOpenedOnce = hasOpenedOnce || isEditorMode;
    return {
        shouldRender: nextHasOpenedOnce,
        isVisible: isEditorMode,
        nextHasOpenedOnce
    };
};
