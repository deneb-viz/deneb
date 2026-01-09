import powerbi from 'powerbi-visuals-api';
import {
    parse,
    type Spec,
    View,
    Warn,
    type Item,
    type ScenegraphEvent,
    EventListenerHandler
} from 'vega';

import type {
    CrossFilterOptions,
    InteractivityLookupDataset,
    CrossFilterSelectionAssessment,
    CrossFilterSelectionDirective,
    CrossFilterTranslate
} from './types';
import { logDebug } from '@deneb-viz/utils/logging';
import { isPotentialCrossFilterMultiSelectEvent } from './event';
import { InteractivityManager } from './interactivity-manager';
import {
    getResolvedRowIdentities,
    getRowNumbersFromData,
    resolveDatumFromItem
} from './data-point';
import {
    type VegaDatum,
    type DataPointSelectionStatus
} from '@deneb-viz/data-core/value';
import { getDenebVisualState } from '../../state';

const LOG_PREFIX = '[crossFilterHandler]';

/**
 * Creates a Vega event handler function that can be bound to visual elements for cross-filtering behavior.
 */
export const crossFilterHandler = (
    dataset: InteractivityLookupDataset,
    translate: CrossFilterTranslate,
    crossFilterOptions?: CrossFilterOptions
): EventListenerHandler => {
    return (event, item) => {
        event.stopPropagation();
        event.preventDefault();
        const {
            settings: {
                vega: {
                    interactivity: {
                        selectionMode: { value: selectionMode }
                    }
                }
            }
        } = getDenebVisualState();
        if (selectionMode === 'simple' && isCrossFilterPropSet()) {
            const result = getResolvedCrossFilterResult(
                event,
                item ?? ({} as Item),
                dataset,
                translate,
                crossFilterOptions
            );
            logDebug(`${LOG_PREFIX} final cross-filter result`, { result });
            InteractivityManager.crossFilter(result);
            return result;
        }
    };
};

/**
 * Resolves the cross-filter selection directive based on the supplied event, item, dataset, and options.
 */
export const getResolvedCrossFilterResult = (
    event: ScenegraphEvent,
    item: Item,
    dataset: InteractivityLookupDataset,
    translate: CrossFilterTranslate,
    options: CrossFilterOptions | undefined
): CrossFilterSelectionDirective => {
    try {
        const multiSelect = isMultiSelect(event, options);
        logDebug(`${LOG_PREFIX} Cross-filter event`, {
            event,
            item,
            dataset,
            multiSelect
        });
        if (isCrossFilterPropSet()) {
            const resolved = isSimpleCrossFilterMode(options)
                ? getCrossFilterSelectionSimpleMode(item, dataset, translate)
                : getCrossFilterSelectionAdvanced(
                      event,
                      item,
                      dataset,
                      translate,
                      options!
                  );
            logDebug(`${LOG_PREFIX} resolved cross-filter data`, {
                resolved
            });
            // Don't proceed if there's a warning
            if (resolved.warning) {
                throw new Error(resolved.warning);
            }
            // If we potentially exceed our limit then we want to keep current selection
            if (
                isCrossFilterPointLimitExceeded(
                    resolved.rowNumbers,
                    event,
                    options
                )
            ) {
                const limit = getCrossFilterSelectionLimitSize(options);
                logDebug(
                    `${LOG_PREFIX} cross-filter selection limit exceeded`,
                    {
                        limit,
                        intended: resolved.rowNumbers
                    }
                );
                return {
                    exceedsLimit: true,
                    rowNumbers: resolved.rowNumbers,
                    multiSelect
                };
            }
            // If identities were resolved, apply them
            if (resolved.rowNumbers.length > 0) {
                logDebug(`${LOG_PREFIX} direct resolution from data`, {
                    resolved
                });
                return {
                    rowNumbers: resolved.rowNumbers,
                    multiSelect
                };
            }
        }
    } catch (e) {
        return {
            rowNumbers: [],
            warning: translate(
                'PowerBI_Text_Warning_Invalid_Cross_Filter_General_Error',
                [(e as Error).message]
            )
        };
    }
    logDebug(`${LOG_PREFIX} clearing selection as no valid data points found`);
    return { rowNumbers: [] };
};

/**
 * For advanced cross-filtering, we create a headless Vega view, with the same dataset and top-level signals as our
 * visual. We then apply the filter expression to the dataset, and retrieve the resulting data points. We then extract
 * the identities from this data, and return them.
 */
const getCrossFilterSelectionAdvanced = (
    event: ScenegraphEvent,
    item: Item,
    dataset: InteractivityLookupDataset,
    translate: CrossFilterTranslate,
    options: CrossFilterOptions
): CrossFilterSelectionAssessment => {
    logDebug(
        `${LOG_PREFIX} deriving identities for advanced cross-filtering...`
    );
    try {
        const signals = (event as any)?.['dataflow']?._signals || {};
        const { filterExpr } = options;
        const datasetName = 'cross-filter';
        const headlessSpec: Spec = {
            signals: Object.keys(signals).map((key) => ({
                name: key,
                value: signals[key]
            })),
            data: [
                {
                    name: datasetName,
                    values: dataset.values,
                    transform: filterExpr
                        ? [
                              {
                                  type: 'filter',
                                  expr: filterExpr
                              }
                          ]
                        : []
                }
            ]
        };
        logDebug(
            `${LOG_PREFIX} performing headless validation of cross-filter options...`,
            { event, item, options, headlessSpec, signals }
        );
        const filteredData: VegaDatum[] = new View(parse(headlessSpec))
            .logLevel(Warn)
            .initialize(undefined)
            .renderer('none')
            .hover()
            .run()
            .data(datasetName);
        const rowNumbers = getRowNumbersFromData(filteredData);
        logDebug(`${LOG_PREFIX} headless validation complete`, {
            filteredData,
            rowNumbers
        });
        return { rowNumbers };
    } catch (e) {
        return {
            rowNumbers: [],
            warning: translate(
                'PowerBI_Text_Warning_Invalid_Cross_Filter_General_Error',
                [(e as Error).message]
            )
        };
    }
};

/**
 * For simple cross-filtering, we can simply retrieve the data from the item, and extract the row indexes from this.
 */
const getCrossFilterSelectionSimpleMode = (
    item: Item,
    dataset: InteractivityLookupDataset,
    translate: CrossFilterTranslate
): CrossFilterSelectionAssessment => {
    logDebug(`${LOG_PREFIX} getting selection for simple mode...`);
    try {
        const data = resolveDatumFromItem(item);
        const rowNumbers = getResolvedRowIdentities(data, dataset);
        logDebug(`${LOG_PREFIX} resolved row numbers`, { data, rowNumbers });
        return { rowNumbers };
    } catch (e) {
        return {
            rowNumbers: [],
            warning: translate(
                'Text_Warning_Invalid_Cross_Filter_General_Error',
                [(e as Error).message]
            )
        };
    }
};

/**
 * Retrieve the selection limit size from the options, or the default from the visual settings.
 */
const getCrossFilterSelectionLimitSize = (options?: CrossFilterOptions) => {
    const {
        settings: {
            vega: {
                interactivity: {
                    selectionMaxDataPoints: { value: selectionMaxDataPoints }
                }
            }
        }
    } = getDenebVisualState();
    return ((options && options.limit) || null) ?? selectionMaxDataPoints;
};

/**
 * For the given `ISelectionId`, confirm whether it is present in the supplied `ISelectionId[]`. Typically used to
 * confirm against the visual's selection manager.
 */
export const getDataPointCrossFilterStatus = (
    id: powerbi.visuals.ISelectionId,
    selection: powerbi.visuals.ISelectionId[]
): DataPointSelectionStatus => {
    /* logDebug('getDataPointCrossFilterStatus', { id, selection }); */
    return (
        (selection.find((sid) => sid.equals(id)) && 'on') ||
        (selection.length === 0 && 'neutral') ||
        'off'
    );
};

/**
 * Because existing identities are known to the visual host, we need to combine this quantity and the identities that
 * we're looking to add to this. If this exceeds the maximum, then we should refuse it.
 */
const getPotentialCrossFilterSelectionSize = (
    rowNumbers: number[],
    event: ScenegraphEvent,
    options: CrossFilterOptions | undefined
) =>
    (rowNumbers?.length || 0) +
    (isMultiSelect(event, options)
        ? InteractivityManager.selectionSize() || 0
        : 0);

/**
 * Allows us to validate for all key pre-requisites before we can bind a selection event to the visual.
 */
export const isCrossFilterPropSet = () => {
    const {
        host: { allowInteractions },
        settings: {
            vega: {
                interactivity: {
                    enableSelection: { value: enableSelection }
                }
            }
        }
    } = getDenebVisualState();
    const isSet = enableSelection && allowInteractions;
    return isSet;
};

/**
 * Tests whether the current array of data points for selection exceeds the limit we've imposed in our configuration.
 */
const isCrossFilterPointLimitExceeded = (
    rowNumbers: number[],
    event: ScenegraphEvent,
    options?: CrossFilterOptions
) => {
    const length = getPotentialCrossFilterSelectionSize(
        rowNumbers,
        event,
        options
    );
    const limit = getCrossFilterSelectionLimitSize(options);
    logDebug(`${LOG_PREFIX} isSelectionLimitExceeded check`, {
        length,
        limit,
        options
    });
    return length > limit || false;
};

/**
 * Determine if the window is in multi-select state. For simple mode, this is the same as Power BI, e.g., ctrl or shift
 * is held down. For advanced mode, we can specify which keys should permit multi-select behavior via the options.
 */
const isMultiSelect = (
    event: ScenegraphEvent,
    options: CrossFilterOptions | undefined
) => {
    const isMultiSelect = isSimpleCrossFilterMode(options)
        ? isPotentialCrossFilterMultiSelectEvent(event as MouseEvent)
        : (options?.multiSelect?.includes('ctrl') && event.ctrlKey && true) ||
          (options?.multiSelect?.includes('shift') && event.shiftKey && true) ||
          (options?.multiSelect?.includes('alt') && event.altKey && true) ||
          false;
    logDebug(`${LOG_PREFIX} isMultiSelect check`, {
        options,
        isMultiSelect
    });
    return isMultiSelect;
};

/**
 * Determine if cross-filtering mode should be simple, based on the options provided (or omitted).
 */
const isSimpleCrossFilterMode = (options: CrossFilterOptions | undefined) =>
    !options || options.mode === 'simple';
