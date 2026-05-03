import { useEffect, useRef } from 'react';

import { getDenebState, useDenebState } from '../state';

/**
 * Wires `<RetainedDenebEditor>`'s mode/gate state to the global
 * stores. Three side effects, no rendered output:
 *
 *   1. Sync `interface.type` to `'editor'` on every transition into
 *      editor mode. With editor-tree retention `<DenebEditor>` only
 *      mounts once per visual instance, so the in-tree
 *      `useDenebAppSetup('editor')` call no longer fires on retained
 *      reopens — without this dispatch, anything reading
 *      `interface.type` (e.g. the unapplied-changes toast) would
 *      remain stuck on `'viewer'` after the second open.
 *
 *   2. Close any open `ModalDialog` when leaving editor mode. Fluent
 *      v9 dialogs portal their surface to `document.body` and
 *      bypass the editor wrapper's `display: none`, so they linger
 *      after exit unless explicitly closed.
 *
 *   3. Auto-open the new-project (`'Create'`) modal once the gate
 *      has released for a no-project visual. A user who dismisses
 *      the dialog without creating a project leaves
 *      `isProjectInitialized = false`; without the fired-once
 *      latch, every subsequent gate release would re-open the
 *      dialog and produce a None→Create oscillation on rapid
 *      exit-and-reentry.
 */
export const useEditorModeSync = ({
    isEditorMode,
    isPendingSettle,
    hasOpenedOnce
}: {
    isEditorMode: boolean;
    isPendingSettle: boolean;
    hasOpenedOnce: boolean;
}): void => {
    const setModalDialogRole = useDenebState(
        (state) => state.interface.setModalDialogRole
    );
    const setInterfaceType = useDenebState((state) => state.interface.setType);
    const isProjectInitialized = useDenebState(
        (state) => state.project.__isInitialized__
    );

    useEffect(() => {
        if (isEditorMode) {
            setInterfaceType('editor');
        }
    }, [isEditorMode, setInterfaceType]);

    useEffect(() => {
        if (!isEditorMode && hasOpenedOnce) {
            // Skip the close when an in-progress operation would
            // be interrupted by losing the dialog. Today the only
            // such state is Export tokenization (alert-modal mode
            // in `<ModalDialog>`) — letting the dialog persist
            // through the editor exit means the user sees the
            // tokenization complete (the surface portals to
            // `document.body` so it remains visible over the
            // viewer) and dismisses it normally afterwards.
            // Without this guard, exiting editor mode mid-
            // tokenization clears `modalDialogRole` to `'None'`
            // while `exportProcessingState` stays `'Tokenizing'`,
            // desynchronising the two and orphaning the in-flight
            // tokenization in the worker.
            const { interface: iface } = getDenebState();
            if (
                iface.modalDialogRole === 'Export' &&
                iface.exportProcessingState === 'Tokenizing'
            ) {
                return;
            }
            setModalDialogRole('None');
        }
    }, [isEditorMode, hasOpenedOnce, setModalDialogRole]);

    // The auto-open latch is per "fresh project" rather than per
    // session. Reset when `isProjectInitialized` transitions from
    // true back to false — the user has genuinely started over (e.g.
    // all columns removed in the data well), and the Create dialog
    // is the same expected affordance as on the very first open.
    // Without this reset, a session that has already auto-opened
    // once would silently skip the dialog after the user dropped
    // their data.
    const hasAutoOpenedCreateRef = useRef(false);
    const previousIsProjectInitializedRef = useRef(isProjectInitialized);
    useEffect(() => {
        if (
            previousIsProjectInitializedRef.current === true &&
            isProjectInitialized === false
        ) {
            hasAutoOpenedCreateRef.current = false;
        }
        previousIsProjectInitializedRef.current = isProjectInitialized;
    }, [isProjectInitialized]);

    useEffect(() => {
        if (
            isEditorMode &&
            !isPendingSettle &&
            hasOpenedOnce &&
            !isProjectInitialized &&
            !hasAutoOpenedCreateRef.current
        ) {
            hasAutoOpenedCreateRef.current = true;
            setModalDialogRole('Create');
        }
    }, [
        isEditorMode,
        isPendingSettle,
        hasOpenedOnce,
        isProjectInitialized,
        setModalDialogRole
    ]);
};
