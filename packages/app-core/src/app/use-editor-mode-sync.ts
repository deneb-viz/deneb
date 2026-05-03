import { useEffect, useRef } from 'react';

import { useDenebState } from '../state';

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
            setModalDialogRole('None');
        }
    }, [isEditorMode, hasOpenedOnce, setModalDialogRole]);

    const hasAutoOpenedCreateRef = useRef(false);
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
