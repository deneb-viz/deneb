import { type CSSProperties, useState } from 'react';

import { DenebEditor } from './deneb-editor';
import { computeRetentionState } from './retained-deneb-editor-state';

export { computeRetentionState } from './retained-deneb-editor-state';

const wrapperStyle = (isVisible: boolean): CSSProperties => ({
    boxSizing: 'border-box',
    display: isVisible ? 'flex' : 'none',
    flexDirection: 'column',
    height: '100%',
    width: '100%'
});

interface RetainedDenebEditorProps {
    /**
     * Caller-resolved boolean: `true` exactly when the visual's display
     * mode is `'editor'`. Kept as a boolean rather than a `DisplayMode`
     * union so this component does not pull in either of the
     * package-local `DisplayMode` declarations (one in app-core, one in
     * the root visual).
     */
    isEditorMode: boolean;
}

/**
 * Retains the editor tree across viewer↔editor toggles after the first
 * successful open in the session.
 *
 * Initial state (before any editor open): renders nothing — the editor
 * tree is not mounted, schemas/Monaco/Allotment are not constructed,
 * and the viewer-only path remains as light as possible.
 *
 * After the first transition into editor mode the latch flips and
 * `<DenebEditor />` is mounted permanently for the rest of the visual's
 * lifetime. Subsequent viewer↔editor toggles flip the wrapper between
 * `display: flex` and `display: none` rather than unmounting and
 * remounting the entire tree, eliminating the ~500ms warm-open mount
 * cost (Allotment construction, Monaco editor instances, Vega view
 * setup).
 *
 * The first-open path still goes through `<ViewportSettleGate>` inside
 * `<DenebEditor />`, so the user-perceived experience on the first
 * editor open is unchanged.
 */
export const RetainedDenebEditor = ({
    isEditorMode
}: RetainedDenebEditorProps) => {
    const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

    // Adjusting state during render is the React-blessed pattern for
    // "react to a prop change synchronously before children commit".
    // The set call schedules an immediate re-render with the new latch
    // value, so the very same commit shows DenebEditor (no flash of
    // null between the latch flip and the mount).
    if (!hasOpenedOnce && isEditorMode) {
        setHasOpenedOnce(true);
    }

    const { shouldRender, isVisible } = computeRetentionState(
        hasOpenedOnce,
        isEditorMode
    );

    if (!shouldRender) return null;

    return (
        <div
            style={wrapperStyle(isVisible)}
            data-testid='deneb-retained-editor'
            aria-hidden={!isVisible}
        >
            <DenebEditor />
        </div>
    );
};
