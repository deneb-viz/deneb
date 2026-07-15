import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useSyncExternalStore,
    type ReactNode,
    type RefObject
} from 'react';

import type { WorkerDatasetViewerValueType } from '../../workers/types';

/**
 * State shared by the `InspectorPopover` and every cell that dispatches to it.
 * A single cell at a time can be the inspector's target — opening a new cell
 * replaces the state, ensuring there is only ever one popover open.
 */
interface InspectorPopoverState {
    isOpen: boolean;
    anchorRef: RefObject<HTMLElement | null> | null;
    rawValue: unknown;
    valueType: WorkerDatasetViewerValueType | null;
    cellId: string | null;
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

/**
 * Pure predicate: should a cell that is the currently-targeted inspector
 * cell dispatch `refreshInspector` with the given next `rawValue`/
 * `valueType`? Returns false when the inspector isn't targeting this cell
 * (nothing to refresh) and when the incoming values are referentially
 * identical to the state already held (redundant dispatch would be a
 * no-op). `Object.is` is deliberate — primitives compare by value (so a
 * numeric tick from `n` to `n` is correctly a no-op) and objects by
 * reference (so a freshly-pruned object is treated as changed content).
 */
export const shouldRefreshInspector = (
    state: Pick<
        InspectorPopoverState,
        'isOpen' | 'cellId' | 'rawValue' | 'valueType'
    >,
    cellId: string,
    nextRawValue: unknown,
    nextValueType: WorkerDatasetViewerValueType
): boolean => {
    if (!isOpenForCellId(state, cellId)) return false;
    if (
        Object.is(state.rawValue, nextRawValue) &&
        state.valueType === nextValueType
    ) {
        return false;
    }
    return true;
};

/**
 * Minimal external store (subscribe/getState/setState) backing the
 * inspector popover's state. The store OBJECT — not a plain state value —
 * is what travels through `InspectorStoreContext`, and its identity never
 * changes across renders. That's what lets `useIsInspectorOpenForCell`
 * subscribe via `useSyncExternalStore`: each cell computes its own
 * boolean slice of the state and React bails out of re-rendering that cell
 * when the slice is unchanged (`Object.is` on the returned boolean),
 * instead of every consumer re-rendering whenever ANY field of the shared
 * state changes (which is what a plain `useContext(fullStateContext)`
 * cannot avoid).
 */
interface InspectorStore {
    getState: () => InspectorPopoverState;
    setState: (next: InspectorPopoverState) => void;
    subscribe: (listener: () => void) => () => void;
}

const createInspectorStore = (
    initial: InspectorPopoverState
): InspectorStore => {
    let state = initial;
    const listeners = new Set<() => void>();
    return {
        getState: () => state,
        setState: (next) => {
            state = next;
            listeners.forEach((listener) => listener());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
};

/** No-op subscription used by the selector hooks outside a provider. */
const emptySubscribe = () => () => {};

/**
 * Stable action surface exposed to cells for dispatching to the shared
 * inspector popover. Mirrors the keyboard context's action/state split
 * (`data-table-keyboard-context.tsx`): the identity of this object and its
 * methods never changes for the lifetime of the provider, so a cell's
 * `useEffect` dependency arrays that list these actions don't churn (or
 * force a re-render) on every popover state change.
 *
 * `getSnapshot` is a non-reactive escape hatch: cells use it inside the
 * live-refresh effect to read the inspector's CURRENTLY stored value (the
 * comparison target for `shouldRefreshInspector`) without subscribing to
 * state changes at the component level. Subscribing there — as the
 * predecessor single-context design did, by listing the whole context
 * value as an effect dependency — is what caused every mounted cell to
 * re-render on every popover state change, including a signal ticking
 * under an open inspector re-rendering every row on every tick (Important
 * #12).
 */
interface InspectorPopoverActions {
    openInspector: (
        anchorRef: RefObject<HTMLElement | null>,
        rawValue: unknown,
        valueType: WorkerDatasetViewerValueType,
        cellId: string
    ) => void;
    closeInspector: () => void;
    refreshInspector: (
        rawValue: unknown,
        valueType: WorkerDatasetViewerValueType
    ) => void;
    getSnapshot: () => InspectorPopoverState;
}

const InspectorActionsContext = createContext<InspectorPopoverActions | null>(
    null
);
const InspectorStoreContext = createContext<InspectorStore | null>(null);

/**
 * Hook for cells (and the inspector itself) to obtain the stable action
 * callbacks, plus a non-reactive snapshot getter. Returns `null` outside a
 * provider so cells with `inspectable={false}` (the signal-viewer key
 * column, or cells rendered in isolated test harnesses) can mount without a
 * `DataTableInspectorProvider`. Consumers that genuinely require the
 * provider (e.g. `InspectorPopover`) should short-circuit when this returns
 * null rather than throwing deep inside a render tree.
 */
export const useDataTableInspectorActions =
    (): InspectorPopoverActions | null => useContext(InspectorActionsContext);

/**
 * Selector-based subscription: re-renders the calling cell only when
 * whether-THIS-cell-is-open flips — not on every popover state change (a
 * ticking signal's `rawValue` update while a different cell is inspected,
 * or even while the popover is closed entirely). `useSyncExternalStore`
 * bails out of the re-render when the selected boolean is unchanged, which
 * a plain context subscription to the full state object cannot do (a new
 * state object is a new reference every time, so every subscriber would
 * re-render regardless of whether ITS derived value changed).
 */
export const useIsInspectorOpenForCell = (cellId: string | null): boolean => {
    const store = useContext(InspectorStoreContext);
    return useSyncExternalStore(store?.subscribe ?? emptySubscribe, () =>
        store && cellId ? isOpenForCellId(store.getState(), cellId) : false
    );
};

/**
 * Full reactive inspector state. Intended for `InspectorPopover` only — the
 * single instance per `DataTableViewer` that actually renders the popover
 * surface and legitimately needs every field. Per-cell consumers should use
 * `useIsInspectorOpenForCell` instead; subscribing to the full state here
 * from every cell is exactly the fan-out re-render this module's split
 * exists to avoid.
 */
export const useDataTableInspectorState = (): InspectorPopoverState | null => {
    const store = useContext(InspectorStoreContext);
    return useSyncExternalStore(
        store?.subscribe ?? emptySubscribe,
        () => store?.getState() ?? null
    );
};

/**
 * Provides shared state for a single inspector popover hosted at the
 * `DataTableViewer` level. Cells call `openInspector` (via
 * `useDataTableInspectorActions`) to target the popover; `InspectorPopover`
 * reads the reactive state via `useDataTableInspectorState`.
 */
export const DataTableInspectorProvider = ({
    children
}: {
    children: ReactNode;
}) => {
    // The store is created once and its identity never changes — it is
    // deliberately NOT React state. `setState` mutates a closure variable
    // and synchronously notifies listeners, so `getState()` immediately
    // after a `setState` call always reflects the latest value, with no
    // dependency on React's render/commit timing (the predecessor
    // `stateRef` mirror existed only to work around that timing; a plain
    // closure variable sidesteps the problem entirely).
    const storeRef = useRef<InspectorStore | null>(null);
    if (!storeRef.current) {
        storeRef.current = createInspectorStore(INSPECTOR_POPOVER_CLOSED_STATE);
    }
    const store = storeRef.current;

    const openInspector = useCallback<InspectorPopoverActions['openInspector']>(
        (anchorRef, rawValue, valueType, cellId) => {
            store.setState({
                isOpen: true,
                anchorRef,
                rawValue,
                valueType,
                cellId
            });
        },
        [store]
    );

    const closeInspector = useCallback(() => {
        // Idempotent: the coordinate-rect mousedown handler and Fluent's
        // own `onOpenChange` can both fire `closeInspector` for the same
        // outside-click gesture in the same event-loop tick. Reading
        // `store.getState()` (rather than a closed-over `state` value)
        // means the second call in the same tick observes the first
        // call's synchronous update and no-ops.
        const current = store.getState();
        if (!current.isOpen) return;
        const anchorEl = current.anchorRef?.current;
        store.setState(INSPECTOR_POPOVER_CLOSED_STATE);
        if (anchorEl?.isConnected) {
            anchorEl.focus({ preventScroll: true });
        }
    }, [store]);

    const refreshInspector = useCallback<
        InspectorPopoverActions['refreshInspector']
    >(
        (rawValue, valueType) => {
            // Read from `store.getState()` rather than a closed-over
            // `state` so a `closeInspector` call earlier in the same
            // event-loop tick (which updates the store synchronously)
            // prevents a refresh dispatched against a pre-close snapshot
            // from reopening the popover.
            const current = store.getState();
            if (!current.isOpen) return;
            store.setState({
                ...current,
                rawValue,
                valueType
            });
        },
        [store]
    );

    const getSnapshot = useCallback(() => store.getState(), [store]);

    const actions = useMemo<InspectorPopoverActions>(
        () => ({
            openInspector,
            closeInspector,
            refreshInspector,
            getSnapshot
        }),
        [openInspector, closeInspector, refreshInspector, getSnapshot]
    );

    return (
        <InspectorStoreContext.Provider value={store}>
            <InspectorActionsContext.Provider value={actions}>
                {children}
            </InspectorActionsContext.Provider>
        </InspectorStoreContext.Provider>
    );
};
