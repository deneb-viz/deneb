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

export interface DataTableKeyboardContextValue {
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
    /**
     * Predicate used by cells to drive `tabIndex` — exactly one cell has
     * `tabIndex={0}` at any given time.
     */
    isActive: (cellId: CellId) => boolean;
}

const DataTableKeyboardContext =
    createContext<DataTableKeyboardContextValue | null>(null);

/**
 * Hook for cells to participate in roving tabindex navigation. Must be used
 * inside `DataTableKeyboardProvider`. When used outside the provider (e.g.,
 * in tests of a lone cell), returns `null` so callers can gracefully render
 * without keyboard navigation. The full provider-backed behaviour is only
 * relied upon inside `DataTableViewer`.
 */
export const useDataTableKeyboard = (): DataTableKeyboardContextValue | null =>
    useContext(DataTableKeyboardContext);

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
 */
export const DataTableKeyboardProvider = ({
    colOrder,
    rowCount,
    children
}: DataTableKeyboardProviderProps) => {
    // Mutable ref map rather than state — cells register and unregister on
    // every mount/unmount cycle and tracking this in React state would cause
    // a render cascade. The set of registered IDs is derived on demand.
    const refMapRef = useRef<Map<CellId, RefObject<HTMLElement | null>>>(
        new Map()
    );
    const [activeCellId, setActiveCellId] = useState<CellId | null>(null);

    const getRegisteredIds = useCallback(
        (): ReadonlySet<CellId> => new Set(refMapRef.current.keys()),
        []
    );

    const registerCell = useCallback<
        DataTableKeyboardContextValue['registerCell']
    >(
        (cellId, ref) => {
            refMapRef.current.set(cellId, ref);
            // If we have no active cell yet, make this the active one so that
            // Tab into the table lands somewhere sensible.
            setActiveCellId((prev) => prev ?? cellId);
            return () => {
                refMapRef.current.delete(cellId);
                setActiveCellId((prev) => {
                    if (prev !== cellId) return prev;
                    // The previously-active cell has unregistered (e.g. the
                    // page changed). Fall back to the next sensible default.
                    return pickDefaultActiveCell(colOrder, getRegisteredIds());
                });
            };
        },
        [colOrder, getRegisteredIds]
    );

    // When columns or row count change (e.g., pagination), verify the active
    // cell is still valid; reset to a sensible default otherwise.
    useEffect(() => {
        const registered = getRegisteredIds();
        setActiveCellId((prev) => {
            if (prev && registered.has(prev)) return prev;
            return pickDefaultActiveCell(colOrder, registered);
        });
    }, [colOrder, rowCount, getRegisteredIds]);

    const focusCell = useCallback((cellId: CellId) => {
        const ref = refMapRef.current.get(cellId);
        ref?.current?.focus({ preventScroll: true });
    }, []);

    const setActiveCell = useCallback<
        DataTableKeyboardContextValue['setActiveCell']
    >((cellId) => {
        if (refMapRef.current.has(cellId)) {
            setActiveCellId(cellId);
        }
    }, []);

    const moveActive = useCallback<DataTableKeyboardContextValue['moveActive']>(
        (direction) => {
            setActiveCellId((prev) => {
                if (!prev) return prev;
                const current = parseCellId(prev);
                if (!current) return prev;
                const target = resolveArrowTarget(
                    current,
                    direction,
                    colOrder,
                    rowCount,
                    getRegisteredIds()
                );
                if (target !== prev) focusCell(target);
                return target;
            });
        },
        [colOrder, rowCount, getRegisteredIds, focusCell]
    );

    const moveToRowEndpoint = useCallback<
        DataTableKeyboardContextValue['moveToRowEndpoint']
    >(
        (endpoint) => {
            setActiveCellId((prev) => {
                if (!prev) return prev;
                const current = parseCellId(prev);
                if (!current) return prev;
                const target = resolveRowEndpoint(
                    current,
                    endpoint,
                    colOrder,
                    getRegisteredIds()
                );
                if (target !== prev) focusCell(target);
                return target;
            });
        },
        [colOrder, getRegisteredIds, focusCell]
    );

    const isActive = useCallback<DataTableKeyboardContextValue['isActive']>(
        (cellId) => cellId === activeCellId,
        [activeCellId]
    );

    const value = useMemo<DataTableKeyboardContextValue>(
        () => ({
            registerCell,
            setActiveCell,
            moveActive,
            moveToRowEndpoint,
            isActive
        }),
        [registerCell, setActiveCell, moveActive, moveToRowEndpoint, isActive]
    );

    return (
        <DataTableKeyboardContext.Provider value={value}>
            {children}
        </DataTableKeyboardContext.Provider>
    );
};

/**
 * Re-exported for convenience so cell components don't need to import from
 * the utils file directly for ID construction.
 */
export { buildCellId };
