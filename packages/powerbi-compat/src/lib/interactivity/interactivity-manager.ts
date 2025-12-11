import powerbi from 'powerbi-visuals-api';
import type {
    CrossFilterSelectionDirective,
    DataPointSelectionStatus,
    InteractivityManagerBindOptions,
    SelectionIdQueue,
    Selector,
    SelectorMap,
    SelectorStatus
} from './types';
import { getDataPointCrossFilterStatus } from './cross-filter';
import { logDebug } from '@deneb-viz/utils/logging';
import { isNumber } from '@deneb-viz/utils/inspection';

type SelectionId = powerbi.visuals.ISelectionId;

const LOG_PREFIX = '[InteractivityManager]';

/**
 * Convenience constant for tooltip events, as it's required by Power BI.
 */
const IS_TOUCH_EVENT = true;

/**
 * Empty selection IDs array constant to avoid repeated allocations.
 */
const EMPTY_SELECTION_IDS: SelectionId[] = [];

/**
 * The InteractivityManager is responsible for managing selection and interactivity within a Power BI visual.
 *
 * It keeps track of row identities to generated selection IDs so that these are not stored directly in the base
 * dataset, as these objects can be heavy and impact performance. They can also affect serialization size if stored
 * directly. As they are Power BI-specific objects, this provides a way to isolate them from the core dataset logic.
 *
 * The manager also provides methods to handle Power BI interactivity features such as cross-filtering, context menus,
 * and tooltips, looking up the appropriate selection IDs as needed and handling any necessary callbacks for state
 * management of the dataset (e.g. selection state management).
 */
const manager = (() => {
    /**
     * Internal store mapping floored row numbers to SelectionId objects, and their current status.
     * @private
     */
    const _store: SelectorMap = new Map<number, Selector>();

    /**
     * Optional callback to notify when selection limit is exceeded.
     * @private
     */
    let _limitExceededCallback: InteractivityManagerBindOptions['limitExceededCallback'];

    /**
     * Optional callback to notify when selector statuses are updated.
     * @private
     */
    let _selectorUpdateCallback: InteractivityManagerBindOptions['selectorUpdateCallback'];

    /**
     * The SelectionIdBuilder factory function, set via bind.
     * @private
     */
    let _selectionIdBuilder:
        | (() => powerbi.visuals.ISelectionIdBuilder)
        | null = null;

    /**
     * The SelectionManager instance, set via bind.
     * @private
     */
    let _selectionManager: powerbi.extensibility.ISelectionManager | null =
        null;

    /**
     * The TooltipService instance, set via bind.
     * @private
     */
    let _tooltipService: powerbi.extensibility.ITooltipService | null = null;

    /**
     * Cached length of the selection queue entries array. The queue structure is
     * consistent across rows, so we capture this once (first row) to avoid
     * repeated property access for large datasets.
     * @private
     */
    let _cachedQueueLength: number | undefined = undefined;

    /**
     * For an individual row number, get the associated SelectionId object, if present in the store.
     * @private
     */
    const _getSelectionId = (rowNumber: number): SelectionId | undefined => {
        const selector = _store.get(_resolveRowNumber(rowNumber));
        return selector?.id;
    };

    /**
     * For an array of row numbers, get the associated SelectionId objects, if present in the store.
     * @private
     */
    const _getSelectionIds = (rowNumbers: number[]): SelectionId[] => {
        const selectionIds: SelectionId[] = [];
        for (const rn of rowNumbers) {
            const selector = _store.get(_resolveRowNumber(rn));
            if (selector) {
                selectionIds.push(selector.id);
            }
        }
        return selectionIds;
    };

    /**
     * Resets the selection state of all selectors in the store to neutral.
     * @private
     */
    const _resetSelectionState = () => {
        for (const [, selector] of _store.entries()) {
            selector.status = 'neutral';
        }
    };

    /**
     * Provides a consistent way to ensure that a supplied row number is treated as a floored integer.
     * @private
     */
    const _resolveRowNumber = (rowNumber: number) => Math.floor(rowNumber);

    /**
     * For the supplied row number(s) and multiselect flag, resolve cross-filtering events via the selection manager.
     * @private
     */
    async function _select(
        rowNumber: number,
        isMultiSelect?: boolean
    ): Promise<SelectorStatus>;
    async function _select(
        rowNumbers: number[],
        isMultiSelect?: boolean
    ): Promise<SelectorStatus>;
    async function _select(
        arg: number | number[],
        isMultiSelect?: boolean
    ): Promise<SelectorStatus> {
        if (!_selectionManager) {
            throw new Error(
                `${LOG_PREFIX} SelectionManager has not been set in InteractivityManager.`
            );
        }
        /**
         * 'Clear selection' cases:
         * - No argument provided
         * - Empty array provided
         */
        if (
            typeof arg === 'undefined' ||
            (Array.isArray(arg) && arg.length === 0)
        ) {
            return _selectionManager.clear().then(() => {
                _resetSelectionState();
                return {} as SelectorStatus;
            });
        }

        /**
         * Apply selection:
         * - Apply selection state based on SelectionIds for the provided row(s)
         * - Verify applied selections after the host has finished (in the promise) and update selector statuses
         */
        const toApply: SelectionId[] = [];
        if (typeof arg === 'number') {
            const selector = _store.get(_resolveRowNumber(arg));
            if (selector) {
                toApply.push(selector.id);
            }
        } else if (Array.isArray(arg)) {
            for (const rn of arg) {
                const selector = _store.get(_resolveRowNumber(rn));
                if (selector) {
                    toApply.push(selector.id);
                }
            }
        }
        logDebug(`${LOG_PREFIX} Applying selection via InteractivityManager`, {
            toApply,
            isMultiSelect
        });
        return _selectionManager.select(toApply, !!isMultiSelect).then((i) => {
            logDebug(
                `${LOG_PREFIX} Selection applied; updating selector statuses`,
                { i }
            );
            const selectorStatus: SelectorStatus = new Map<
                number,
                DataPointSelectionStatus
            >();
            for (const [rowNumber, selector] of _store.entries()) {
                selector.status = getDataPointCrossFilterStatus(
                    selector.id,
                    i as SelectionId[]
                );
                selectorStatus.set(rowNumber, selector.status);
            }
            return selectorStatus;
        });
    }

    /**
     * Registers the selection manager and selection ID builder services for interactivity management.
     * @param manager - The Power BI selection manager instance used to handle visual selections
     * @param builder - A factory function that creates new selection ID builder instances
     * @public
     */
    const bind = (options: InteractivityManagerBindOptions) => {
        const { host, limitExceededCallback } = options;
        _selectionManager = host.createSelectionManager();
        _selectionIdBuilder = host.createSelectionIdBuilder;
        _tooltipService = host.tooltipService;
        _limitExceededCallback = limitExceededCallback;
        _selectorUpdateCallback = options.selectorUpdateCallback;
    };

    /**
     * Adds a selector to the store for the current row number based on the provided fields.
     *
     * @param queue - A `SelectionIdQueue` object containing the row number and field entries. Must be non-empty.
     *
     * @returns A `Selector` object if successfully created, or `null` if the operation failed.
     *
     * @throws {Error} If rowNumber is not a finite number.
     * @throws {Error} If fields is null, undefined, or empty.
     * @throws {Error} If SelectionIdBuilder has not been initialized in the selector manager.
     *
     * @public
     */
    const addRowSelector = (queue: SelectionIdQueue): Selector | null => {
        const { rowNumber, entries } = queue;
        if (!Number.isFinite(rowNumber)) {
            throw new Error(`${LOG_PREFIX} rowNumber must be a finite number`);
        }
        if (!entries || entries.length === 0) {
            throw new Error(`${LOG_PREFIX} fields must be a non-empty array`);
        }
        if (!_selectionIdBuilder) {
            throw new Error(
                `${LOG_PREFIX} SelectionIdBuilder has not been set in InteractivityManager.`
            );
        }
        const key = _resolveRowNumber(rowNumber);
        const builder = _selectionIdBuilder();

        /**
         * Optimized: use for-loop instead of forEach (faster in hot paths) and cache length to avoid repeated property
         * access.
         */
        const entryCount =
            _cachedQueueLength ?? (_cachedQueueLength = entries.length);
        for (let i = 0; i < entryCount; i++) {
            const field = entries[i];
            if (!field) continue;
            if (field.type === 'category') {
                builder.withCategory(field.column, rowNumber);
            } else {
                builder.withMeasure(field.queryName);
            }
        }

        const id = builder.createSelectionId();
        const selection = _selectionManager?.hasSelection()
            ? (_selectionManager.getSelectionIds() as powerbi.visuals.ISelectionId[])
            : EMPTY_SELECTION_IDS;
        const status = getDataPointCrossFilterStatus(id, selection);
        const selector: Selector = { id, status };
        _store.set(key, selector);
        return selector;
    };

    /**
     * Removes all row-to-selection mappings, ready for a new dataset.
     * @public
     */
    const clearSelectors = (): void => {
        _store.clear();
        _selectionManager?.clear();
        _cachedQueueLength = undefined;
    };

    /**
     * Request to apply cross-filtering based on the provided directive.
     *
     * @param directive - The cross-filter selection directive containing row numbers and options
     *
     * @remarks
     * If any callbacks were provided during binding, they will be invoked as part of this process to notify any
     * dependent systems of selection state changes or exceeded limits.
     *
     * @public
     */
    const crossFilter = async (
        directive?: CrossFilterSelectionDirective
    ): Promise<void> => {
        const {
            rowNumbers = [],
            multiSelect = false,
            exceedsLimit = false
        } = directive || {};
        if (exceedsLimit) {
            return _limitExceededCallback?.(true) || Promise.resolve();
        }
        if (rowNumbers.length === 0) {
            return _select([]).then(() =>
                _selectorUpdateCallback?.(
                    new Map<number, DataPointSelectionStatus>()
                ).then(() => _limitExceededCallback?.(false))
            );
        }

        return _select(rowNumbers, multiSelect).then((selectorStatus) =>
            _selectorUpdateCallback?.(selectorStatus).then(() =>
                _limitExceededCallback?.(false)
            )
        );
    };

    /**
     * Indicates whether there is an active selection, according to the selection manager.
     * @public
     */
    const hasSelection = () => {
        return _selectionManager?.hasSelection() ?? false;
    };

    /**
     * Hides any currently visible tooltip via the tooltip service.
     * @public
     */
    const hideTooltip = () => {
        if (!_tooltipService) {
            throw new Error(
                `${LOG_PREFIX} TooltipService has not been set in InteractivityManager.`
            );
        }
        _tooltipService.hide({
            immediately: true,
            isTouchEvent: IS_TOUCH_EVENT
        });
    };

    /**
     * Get the current size of the selection, according to the selection manager.
     * @public
     */
    const selectionSize = () => {
        return _selectionManager?.getSelectionIds().length ?? 0;
    };

    /**
     * Shows a context menu for the specified row number at the given position.
     *
     * @param rowNumber - The row number for which to show the context menu. If undefined, no selection ID will be used.
     * @param position - The x and y coordinates where the context menu should be displayed.
     *
     * @public
     */
    const showContextMenu = (
        rowNumber: number | undefined,
        position: { x: number; y: number }
    ) => {
        if (!_selectionManager) {
            throw new Error(
                `${LOG_PREFIX} SelectionManager has not been set in InteractivityManager.`
            );
        }
        let selectionId: powerbi.visuals.ISelectionId | undefined;
        if (isNumber(rowNumber)) {
            selectionId = _getSelectionId(rowNumber);
        }
        logDebug(`${LOG_PREFIX} showing context menu`, {
            rowNumber,
            position,
            selectionId
        });
        _selectionManager.showContextMenu(selectionId ?? [], position);
    };

    /**
     * Shows a tooltip for the specified data items at the given position, with an optional delay.
     *
     * @param dataItems - The tooltip data items to display
     * @param rowNumbers - The row numbers associated with the tooltip, used to retrieve selection IDs
     * @param coordinates - The x and y coordinates where the tooltip should be displayed
     * @param delay - An optional delay in milliseconds before showing the tooltip
     *
     * @public
     */
    const showTooltip = (
        dataItems: powerbi.extensibility.VisualTooltipDataItem[],
        rowNumbers: number[],
        coordinates: number[],
        delay: number
    ) => {
        if (!_tooltipService) {
            throw new Error(
                `${LOG_PREFIX} TooltipService has not been set in InteractivityManager.`
            );
        }
        const show = () => {
            _tooltipService?.show({
                dataItems,
                identities: _getSelectionIds(rowNumbers),
                isTouchEvent: IS_TOUCH_EVENT,
                coordinates
            });
        };
        if (delay > 0) {
            setTimeout(show, delay);
        } else {
            show();
        }
    };

    return {
        bind,
        addRowSelector,
        clearSelectors,
        crossFilter,
        hasSelection,
        hideTooltip,
        selectionSize,
        showContextMenu,
        showTooltip
    } as const;
})();

export const InteractivityManager = manager;
