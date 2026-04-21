import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject
} from 'react';

import type { WorkerDatasetViewerValueType } from '../../workers/types';

/**
 * State shared by the `InspectorPopover` and every cell that dispatches to it.
 * A single cell at a time can be the inspector's target — opening a new cell
 * replaces the state, ensuring there is only ever one popover open.
 */
export interface InspectorPopoverState {
    isOpen: boolean;
    anchorRef: RefObject<HTMLElement | null> | null;
    rawValue: unknown;
    valueType: WorkerDatasetViewerValueType | null;
    cellId: string | null;
}

export interface InspectorPopoverContextValue extends InspectorPopoverState {
    /**
     * Open the inspector on the given cell. Replaces any previously open state
     * so that at most one inspector is visible at a time.
     */
    openInspector: (
        anchorRef: RefObject<HTMLElement | null>,
        rawValue: unknown,
        valueType: WorkerDatasetViewerValueType,
        cellId: string
    ) => void;
    /**
     * Close the inspector and restore focus to the previously opening cell if
     * the anchor element is still connected to the DOM.
     */
    closeInspector: () => void;
}

export const INSPECTOR_POPOVER_CLOSED_STATE: InspectorPopoverState = {
    isOpen: false,
    anchorRef: null,
    rawValue: undefined,
    valueType: null,
    cellId: null
};

/**
 * Pure predicate: given a state and a cell ID, is the inspector currently
 * targeting that cell? Exposed for testability.
 */
export const isOpenForCellId = (
    state: Pick<InspectorPopoverState, 'isOpen' | 'cellId'>,
    cellId: string
): boolean => state.isOpen && state.cellId === cellId;

const InspectorPopoverContext =
    createContext<InspectorPopoverContextValue | null>(null);

/**
 * Hook for cells and the inspector itself to consume the shared popover state.
 * Returns `null` outside a provider so cells with `inspectable={false}` (the
 * signal-viewer key column, or cells rendered in isolated test harnesses) can
 * mount without a `DataTableInspectorProvider`. Consumers that genuinely
 * require the provider (e.g. `InspectorPopover`) should short-circuit when
 * this returns null rather than throwing deep inside a render tree.
 */
export const useDataTableInspector = (): InspectorPopoverContextValue | null =>
    useContext(InspectorPopoverContext);

/**
 * Provides shared state for a single inspector popover hosted at the
 * `DataTableViewer` level. Cells call `openInspector` to target the popover;
 * the popover reads `isOpen`, `anchorRef`, `rawValue`, and `valueType` from
 * this provider.
 */
export const DataTableInspectorProvider = ({
    children
}: {
    children: ReactNode;
}) => {
    const [state, setState] = useState<InspectorPopoverState>(
        INSPECTOR_POPOVER_CLOSED_STATE
    );

    // Mirror state into a ref so `closeInspector` can read the current anchor
    // without performing the focus side effect inside a `setState` updater.
    // React treats updater callbacks as pure; in StrictMode (and under
    // concurrent rendering) they may run more than once per dispatch, which
    // would double-fire `anchorEl.focus()` and produce duplicate screen-reader
    // announcements or a momentary flicker back to the cell.
    const stateRef = useRef<InspectorPopoverState>(state);
    stateRef.current = state;

    const openInspector = useCallback<
        InspectorPopoverContextValue['openInspector']
    >((anchorRef, rawValue, valueType, cellId) => {
        setState({
            isOpen: true,
            anchorRef,
            rawValue,
            valueType,
            cellId
        });
    }, []);

    const closeInspector = useCallback(() => {
        // Idempotent: the coordinate-rect mousedown handler and Fluent's
        // own `onOpenChange` can both fire `closeInspector` for the same
        // outside-click gesture in the same event-loop tick. The `isOpen`
        // closure in `handleOpenChange` reads a stale render's value, so
        // its `if (!isOpen) return` guard won't suppress the second call.
        // Update `stateRef` synchronously so any follow-up call sees the
        // closed state before React commits the next render, and
        // `anchorEl.focus()` fires only once per dismissal.
        if (!stateRef.current.isOpen) return;
        const anchorEl = stateRef.current.anchorRef?.current;
        stateRef.current = INSPECTOR_POPOVER_CLOSED_STATE;
        setState(INSPECTOR_POPOVER_CLOSED_STATE);
        if (anchorEl?.isConnected) {
            anchorEl.focus({ preventScroll: true });
        }
    }, []);

    const value = useMemo<InspectorPopoverContextValue>(
        () => ({
            ...state,
            openInspector,
            closeInspector
        }),
        [state, openInspector, closeInspector]
    );

    return (
        <InspectorPopoverContext.Provider value={value}>
            {children}
        </InspectorPopoverContext.Provider>
    );
};
