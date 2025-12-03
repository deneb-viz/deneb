import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import * as Vega from 'vega';

import { hidePowerBiTooltip } from './tooltip';
import { getState } from '../../store';
import { getIdentitiesFromData, getSelectorsFromData } from './data-point';
import { CrossFilterOptions, CrossFilterResult } from './types';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { type DatasetValueRow } from '@deneb-viz/dataset/datum';
import {
    getI18nValue,
    getVisualSelectionManager,
    getVisualSettings
} from '@deneb-viz/powerbi-compat/visual-host';
import { isCrossFilterPropSet } from '@deneb-viz/powerbi-compat/interactivity';
import { logDebug } from '@deneb-viz/utils/logging';
import { resolveDatumFromItem } from '@deneb-viz/vega-runtime/provenance';

/**
 * For the supplied list of identities, ensure that the selection manager is
 * invoked, before synchronising the dataset for correct selection status.
 */
const applySelection = (
    identities: ISelectionId[],
    event: Vega.ScenegraphEvent,
    options: CrossFilterOptions
) => {
    const { updateDatasetSelectors } = getState();
    logDebug('[pbiCrossFilterApply] applying selection to host', {
        identities,
        event,
        options
    });
    getVisualSelectionManager()
        .select(identities, isMultiSelect(event, options))
        .then(() => {
            updateDatasetSelectors(
                <ISelectionId[]>getVisualSelectionManager().getSelectionIds()
            );
        });
    return getVisualSelectionManager().getSelectionIds();
};

/**
 * Handles clearing of visual data point selection state.
 */
export const clearSelection = (): ISelectionId[] => {
    const { updateDatasetSelectors } = getState();
    getVisualSelectionManager()
        .clear()
        .then(() => updateDatasetSelectors([]));
    return [];
};

/**
 * Handle dispatch event for the 'selection blocked' message bar status to the
 * store.
 */
export const dispatchCrossFilterAbort = (
    status = false,
    limit = DEFAULTS.vega.selectionMaxDataPoints
) => {
    getState().updateDatasetSelectionAbortStatus({ status, limit });
};

/**
 * Because existing identities are known to the visual host, we need to combine
 * this quantity and the identities that we're looking to add to this. If this
 * exceeds the maximum, then we should refuse it.
 */
const getPotentialSelectionSize = (
    identities: ISelectionId[],
    event: Vega.ScenegraphEvent,
    options: CrossFilterOptions
) =>
    (identities?.length || 0) +
    (isMultiSelect(event, options)
        ? getVisualSelectionManager().getSelectionIds()?.length || 0
        : 0);
/**
 * If a click event is fired over the visual, attempt to retrieve any datum and
 * associated identity, before applying selection/cross-filtering.
 */
export const handleCrossFilterEvent = (
    event: Vega.ScenegraphEvent,
    item: Vega.Item,
    options?: CrossFilterOptions
): CrossFilterResult => {
    event.stopPropagation();
    event.preventDefault();
    const {
        visualSettings: {
            vega: {
                interactivity: {
                    enableSelection: { value: enableSelection }
                }
            }
        }
    } = getState();
    if (isCrossFilterPropSet({ enableSelection })) {
        try {
            hidePowerBiTooltip();
            const resolved = isSimpleSelectionMode(options)
                ? getCrossFilterIdentitiesSimple(event, item)
                : getCrossFilterIdentitiesAdvanced(event, item, options);
            if (resolved.warning) {
                throw new Error(resolved.warning);
            }
            let identities: ISelectionId[] = [];
            switch (true) {
                case isSelectionLimitExceeded(
                    resolved.identities,
                    event,
                    options
                ): {
                    dispatchCrossFilterAbort(
                        true,
                        getSelectionLimitSize(options)
                    );
                    identities = <ISelectionId[]>(
                        getVisualSelectionManager().getSelectionIds()
                    );
                    logDebug('[pbiCrossFilterApply] selection limit exceeded', {
                        identities
                    });
                    break;
                }
                case resolved.identities?.length > 0: {
                    const identities = <ISelectionId[]>(
                        applySelection(resolved.identities, event, options)
                    );
                    logDebug(
                        '[pbiCrossFilterApply] selection applied to host',
                        { identities }
                    );
                    break;
                }
                default: {
                    logDebug('[pbiCrossFilterApply] clearing selection');
                    identities = clearSelection();
                }
            }
            return { identities };
        } catch (e) {
            logDebug('[pbiCrossFilterApply] error applying cross-filter', e);
            return {
                identities: [],
                warning: getI18nValue(
                    'Text_Warning_Invalid_Cross_Filter_General_Error',
                    [e.message]
                )
            };
        }
    }
    return { identities: [] };
};

/**
 * For advanced cross-filtering, we create a headless Vega view, with the same dataset and top-level signals as our
 * visual. We then apply the filter expression to the dataset, and retrieve the resulting data points. We then extract
 * the identities from this data, and return them.
 */
const getCrossFilterIdentitiesAdvanced = (
    event: Vega.ScenegraphEvent,
    item: Vega.Item,
    options: CrossFilterOptions
): CrossFilterResult => {
    const {
        dataset: { values }
    } = getState();
    logDebug(
        '[pbiCrossFilterApply] deriving identities for advanced cross-filtering...'
    );
    try {
        const signals = event?.['dataflow']?._signals || {};
        const { filterExpr } = options;
        const datasetName = 'cross-filter';
        const headlessSpec: Vega.Spec = {
            signals: Object.keys(signals).map((key) => ({
                name: key,
                value: signals[key]
            })),
            data: [
                {
                    name: datasetName,
                    values: values,
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
            '[pbiCrossFilterApply] performing headless validation of cross-filter options...',
            { event, item, options, headlessSpec, signals }
        );
        const filteredData: DatasetValueRow[] = new Vega.View(
            Vega.parse(headlessSpec)
        )
            .logLevel(Vega.Warn)
            .initialize(null)
            .renderer('none')
            .hover()
            .run()
            .data(datasetName);
        const identities = getSelectorsFromData(filteredData);
        logDebug('[pbiCrossFilterApply] headless validation complete', {
            filteredData,
            identities
        });
        return { identities };
    } catch (e) {
        return {
            identities: [],
            warning: getI18nValue(
                'Text_Warning_Invalid_Cross_Filter_General_Error',
                [e.message]
            )
        };
    }
};

/**
 * For simple cross-filtering, we can simply retrieve the data from the item, and extract the identities from this.
 */
const getCrossFilterIdentitiesSimple = (
    event: Vega.ScenegraphEvent,
    item: Vega.Item
): CrossFilterResult => {
    logDebug(
        '[pbiCrossFilterApply] deriving identities for simple cross-filtering...'
    );
    try {
        const data = resolveDatumFromItem(item);
        const identities = getIdentitiesFromData(data);
        logDebug('[pbiCrossFilterApply] simple cross-filtering identities', {
            data,
            identities
        });
        return { identities };
    } catch (e) {
        return {
            identities: [],
            warning: getI18nValue(
                'Text_Warning_Invalid_Cross_Filter_General_Error',
                [e.message]
            )
        };
    }
};

/**
 * Determine if the window is in multi-select state. For simple mode, this is the same as Power BI, e.g., ctrl or shift
 * is held down. For advanced mode, we can specify which keys should permit multi-select behavior via the options.
 */
const isMultiSelect = (
    event: Vega.ScenegraphEvent,
    options: CrossFilterOptions
) => {
    const isMultiSelect = isSimpleSelectionMode(options)
        ? event.ctrlKey || event.shiftKey || false
        : (options.multiSelect.includes('ctrl') && event.ctrlKey && true) ||
          (options.multiSelect.includes('shift') && event.shiftKey && true) ||
          (options.multiSelect.includes('alt') && event.altKey && true) ||
          false;
    logDebug('[pbiCrossFilterApply] isMultiSelect check', {
        options,
        isMultiSelect
    });
    return isMultiSelect;
};

/**
 * Tests whether the current array of data points for selection exceeds the limit
 * we've imposed in our configuration.
 */
const isSelectionLimitExceeded = (
    identities: ISelectionId[],
    event: Vega.ScenegraphEvent,
    options?: CrossFilterOptions
) => {
    const length = getPotentialSelectionSize(identities, event, options);
    const limit = getSelectionLimitSize(options);
    logDebug('[pbiCrossFilterApply] isSelectionLimitExceeded check', {
        length,
        limit,
        options
    });
    return length > limit || false;
};

/**
 * Determine if cross-filtering mode should be simple, based on the options provided (or omitted).
 */
const isSimpleSelectionMode = (options?: CrossFilterOptions) =>
    !options || options.mode === 'simple';

/**
 * Retrieve the selection limit size from the options, or the default from the visual settings.
 */
const getSelectionLimitSize = (options?: CrossFilterOptions) => {
    const {
        vega: {
            interactivity: {
                selectionMaxDataPoints: { value: selectionMaxDataPoints }
            }
        }
    } = getVisualSettings();
    return ((options && options.limit) || null) ?? selectionMaxDataPoints;
};
