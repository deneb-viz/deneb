import {
    createContext,
    useCallback,
    useContext,
    useMemo,
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
    /**
     * Convenience helper for cells to compute whether they are currently
     * targeted by the inspector (used for `aria-expanded`).
     */
    isOpenForCell: (cellId: string) => boolean;
}

export const INSPECTOR_POPOVER_CLOSED_STATE: InspectorPopoverState = {
    isOpen: false,
    anchorRef: null,
    rawValue: undefined,
    valueType: null,
    cellId: null
};

/**
 * Pure state-transition producing the open state for a given target. Exposed
 * for testability.
 */
export const buildOpenState = (
    anchorRef: RefObject<HTMLElement | null>,
    rawValue: unknown,
    valueType: WorkerDatasetViewerValueType,
    cellId: string
): InspectorPopoverState => ({
    isOpen: true,
    anchorRef,
    rawValue,
    valueType,
    cellId
});

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
 * Must be used inside `DataTableInspectorProvider`; throws otherwise to fail
 * loudly rather than rendering a broken inspector silently.
 */
export const useDataTableInspector = (): InspectorPopoverContextValue => {
    const ctx = useContext(InspectorPopoverContext);
    if (!ctx) {
        throw new Error(
            'useDataTableInspector must be used within a DataTableInspectorProvider'
        );
    }
    return ctx;
};

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

    const openInspector = useCallback<
        InspectorPopoverContextValue['openInspector']
    >((anchorRef, rawValue, valueType, cellId) => {
        setState(buildOpenState(anchorRef, rawValue, valueType, cellId));
    }, []);

    const closeInspector = useCallback(() => {
        setState((prev) => {
            const anchorEl = prev.anchorRef?.current;
            if (anchorEl && anchorEl.isConnected) {
                anchorEl.focus({ preventScroll: true });
            }
            return INSPECTOR_POPOVER_CLOSED_STATE;
        });
    }, []);

    const isOpenForCell = useCallback(
        (cellId: string) => isOpenForCellId(state, cellId),
        [state]
    );

    const value = useMemo<InspectorPopoverContextValue>(
        () => ({
            ...state,
            openInspector,
            closeInspector,
            isOpenForCell
        }),
        [state, openInspector, closeInspector, isOpenForCell]
    );

    return (
        <InspectorPopoverContext.Provider value={value}>
            {children}
        </InspectorPopoverContext.Provider>
    );
};
