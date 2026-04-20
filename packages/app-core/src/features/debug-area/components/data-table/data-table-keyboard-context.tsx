import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject
} from 'react';

import {
    buildCellId,
    parseCellId,
    pickDefaultActiveCell,
    resolveArrowTarget,
    resolveRowEndpoint,
    type ArrowDirection,
    type CellId,
    type RowEndpoint
} from './data-table-keyboard-utils';

/**
 * Stable action surface exposed to cells for participating in roving tabindex
 * navigation. The identity of this object and its methods never change for
 * the lifetime of the provider, so cells can safely list `registerCell` in
 * their `useEffect` dependencies without triggering register/unregister
 * churn on every keystroke.
 */
export interface DataTableKeyboardActions {
    /**
     * Register an inspectable cell as a focus target. Returns a cleanup
     * function suitable for a `useEffect` return value.
     */
    registerCell: (
        cellId: CellId,
        ref: RefObject<HTMLElement | null>
    ) => () => void;
    /**
     * Set the currently active cell (called on focus or click). Only changes
     * state if the cell is registered — this guards against stale cell IDs
     * from a previous page.
     */
    setActiveCell: (cellId: CellId) => void;
    /**
     * Move the active cell one step in the given direction, updating both
     * state and DOM focus. Called by cell `onKeyDown` handlers.
     */
    moveActive: (direction: ArrowDirection) => void;
    /**
     * Jump the active cell to the first or last inspectable cell in the
     * current row.
     */
    moveToRowEndpoint: (endpoint: RowEndpoint) => void;
}

const DataTableKeyboardActionsContext =
    createContext<DataTableKeyboardActions | null>(null);

/**
 * Reactive active-cell context. Consumers re-render when the active cell
 * changes so they can update `tabIndex`. Separated from the actions context
 * so changes here do not invalidate the stable action callbacks.
 */
const DataTableActiveCellContext = createContext<CellId | null>(null);

/**
 * Hook for cells to obtain stable action callbacks. Returns `null` outside a
 * provider so cells can render standalone in isolated tests without keyboard
 * wiring.
 */
export const useDataTableKeyboardActions =
    (): DataTableKeyboardActions | null =>
        useContext(DataTableKeyboardActionsContext);

/**
 * Hook for a cell to learn whether it is the currently active (tabbable) cell.
 * Re-renders the cell only when the active cell changes to or from this one.
 */
export const useIsDataTableCellActive = (cellId: CellId | null): boolean => {
    const active = useContext(DataTableActiveCellContext);
    return cellId !== null && active === cellId;
};

export interface DataTableKeyboardProviderProps {
    /**
     * The field names in render order. Used to compute the target cell for
     * left/right/home/end navigation. Changes to this array (e.g., column
     * re-ordering) are picked up on the next render.
     */
    colOrder: string[];
    /**
     * Total number of rows currently rendered on the visible page. Used to
     * clamp down navigation at the last row of the page.
     */
    rowCount: number;
    children: ReactNode;
}

/**
 * Coordinates roving tabindex for cells in a `DataTableViewer`. Only one cell
 * has `tabIndex={0}` at a time; arrow keys move focus within the grid; Tab
 * moves focus out of the table to the next external focusable element.
 *
 * Implementation notes
 * --------------------
 * Action callbacks are stabilised via refs so consuming cells can pass them
 * as `useEffect` dependencies without re-running. The active-cell id is
 * exposed through a separate context so changes there don't invalidate the
 * action callbacks. This split is what lets `registerCell` stay identity-
 * stable across active-cell changes — without it, every arrow-key press
 * would cause every cell to unregister and re-register mid-transition.
 */
export const DataTableKeyboardProvider = ({
    colOrder,
    rowCount,
    children
}: DataTableKeyboardProviderProps) => {
    const refMapRef = useRef<Map<CellId, RefObject<HTMLElement | null>>>(
        new Map()
    );
    const [activeCellId, setActiveCellId] = useState<CellId | null>(null);

    // Mirror provider props and the active cell into refs so the stable
    // callbacks below can read the latest values without listing them in
    // their dependency arrays. Assigning in the render body (rather than a
    // `useEffect`) means an arrow-key dispatch that races a paginate-triggered
    // re-render still reads this render's column order, not the previous one.
    const colOrderRef = useRef(colOrder);
    const rowCountRef = useRef(rowCount);
    const activeCellIdRef = useRef<CellId | null>(activeCellId);
    colOrderRef.current = colOrder;
    rowCountRef.current = rowCount;
    activeCellIdRef.current = activeCellId;

    const getRegisteredIds = useCallback(
        (): ReadonlySet<CellId> => new Set(refMapRef.current.keys()),
        []
    );

    const focusCell = useCallback((cellId: CellId) => {
        const ref = refMapRef.current.get(cellId);
        ref?.current?.focus({ preventScroll: true });
    }, []);

    const registerCell = useCallback<DataTableKeyboardActions['registerCell']>(
        (cellId, ref) => {
            refMapRef.current.set(cellId, ref);
            setActiveCellId((prev) => prev ?? cellId);
            return () => {
                refMapRef.current.delete(cellId);
                setActiveCellId((prev) => {
                    if (prev !== cellId) return prev;
                    return pickDefaultActiveCell(
                        colOrderRef.current,
                        new Set(refMapRef.current.keys())
                    );
                });
            };
        },
        []
    );

    // When columns or row count change (e.g., pagination), verify the active
    // cell is still valid; reset to a sensible default otherwise.
    useEffect(() => {
        setActiveCellId((prev) => {
            const registered = new Set(refMapRef.current.keys());
            if (prev && registered.has(prev)) return prev;
            return pickDefaultActiveCell(colOrder, registered);
        });
    }, [colOrder, rowCount]);

    const setActiveCell = useCallback<
        DataTableKeyboardActions['setActiveCell']
    >((cellId) => {
        if (refMapRef.current.has(cellId)) {
            setActiveCellId(cellId);
        }
    }, []);

    const moveActive = useCallback<DataTableKeyboardActions['moveActive']>(
        (direction) => {
            const prev = activeCellIdRef.current;
            if (!prev) return;
            const current = parseCellId(prev);
            if (!current) return;
            const target = resolveArrowTarget(
                current,
                direction,
                colOrderRef.current,
                rowCountRef.current,
                getRegisteredIds()
            );
            if (target === prev) return;
            setActiveCellId(target);
            focusCell(target);
        },
        [getRegisteredIds, focusCell]
    );

    const moveToRowEndpoint = useCallback<
        DataTableKeyboardActions['moveToRowEndpoint']
    >(
        (endpoint) => {
            const prev = activeCellIdRef.current;
            if (!prev) return;
            const current = parseCellId(prev);
            if (!current) return;
            const target = resolveRowEndpoint(
                current,
                endpoint,
                colOrderRef.current,
                getRegisteredIds()
            );
            if (target === prev) return;
            setActiveCellId(target);
            focusCell(target);
        },
        [getRegisteredIds, focusCell]
    );

    const actions = useMemo<DataTableKeyboardActions>(
        () => ({
            registerCell,
            setActiveCell,
            moveActive,
            moveToRowEndpoint
        }),
        [registerCell, setActiveCell, moveActive, moveToRowEndpoint]
    );

    return (
        <DataTableKeyboardActionsContext.Provider value={actions}>
            <DataTableActiveCellContext.Provider value={activeCellId}>
                {children}
            </DataTableActiveCellContext.Provider>
        </DataTableKeyboardActionsContext.Provider>
    );
};

/**
 * Re-exported for convenience so cell components don't need to import from
 * the utils file directly for ID construction.
 */
export { buildCellId };
