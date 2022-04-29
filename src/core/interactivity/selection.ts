export {
    applySelection,
    bindInteractivityEvents,
    clearSelection,
    createSelectionIds,
    dispatchSelectionAborted,
    getSelectionIdBuilder,
    getSelectionIdentitiesFromData,
    getSidString,
    isContextMenuEnabled,
    isDataPointEnabled,
    isDataPointPropSet,
    getDataPointStatus
};

import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { View, ScenegraphEvent, Item } from 'vega';
import { select } from 'd3-selection';
import forEach from 'lodash/forEach';
import isEqual from 'lodash/isEqual';
import keys from 'lodash/keys';
import matches from 'lodash/matches';
import pickBy from 'lodash/pickBy';

import { getDataset } from '../data/dataset';
import { isFeatureEnabled } from '../utils/features';
import { hostServices } from '../services';
import {
    getVegaSettings,
    IVegaViewDatum,
    resolveDataFromItem,
    resolveDatumForFields
} from '../vega';
import { getState } from '../../store';
import { getCategoryColumns } from '../data/dataView';
import { hideTooltip } from './tooltip';
import { clearCatcherSelector } from '../ui/dom';
import { IVisualDatasetFields, IVisualDatasetValueRow } from '../data';
import { getDatasetFieldsBySelectionKeys } from '../data/fields';
import { DATASET_IDENTITY_NAME, DATASET_ROW_NAME } from '../../constants';
import { TDataPointSelectionStatus } from '../../features/interactivity';

/**
 * Confirm that each dataum in a datset contains a reconcilable identifier for
 * selection purposes.
 */
const allDataHasIdentities = (data: IVegaViewDatum[]) =>
    data?.filter((d) => d?.hasOwnProperty(DATASET_ROW_NAME))?.length ===
    data?.length;

/**
 * For the supplied list of identities, ensure that the selection manager is
 * invoked, before synchronising the dataset for correct selection status.
 */
const applySelection = (identities: ISelectionId[]) => {
    const { selectionManager } = hostServices;
    const { updateDatasetSelectors } = getState();
    selectionManager.select(identities, isMultiSelect()).then(() => {
        updateDatasetSelectors(
            <ISelectionId[]>selectionManager.getSelectionIds()
        );
    });
};

/**
 * Bind the interactivity events to the Vega view, based on feature switches
 * and properties.
 */
const bindInteractivityEvents = (view: View) => {
    bindContextMenuEvents(view);
    bindDataPointEvents(view);
};

/**
 * For the supplied View, check conditions for context menu binding, and
 * apply/remove as necessary.
 */
const bindContextMenuEvents = (view: View) => {
    view.addEventListener('contextmenu', handleContextMenuEvent);
    select(clearCatcherSelector(true)).on(
        'contextmenu',
        handleContextMenuEvent
    );
};

/**
 * For the supplied View, check conditions for data point selection binding,
 * and apply/remove as necessary.
 */
const bindDataPointEvents = (view: View) => {
    view.addEventListener('click', handleDataPointEvent);
    select(clearCatcherSelector(true)).on('click', handleDataPointEvent);
};

/**
 * Handles clearing of visual data point selection state.
 */
const clearSelection = () => {
    const { updateDatasetSelectors } = getState();
    hostServices.selectionManager
        .clear()
        .then(() => updateDatasetSelectors([]));
};

/**
 * Handle dispatch event for the 'selection blocked' message bar status to the
 * store.
 */
const dispatchSelectionAborted = (state = false) => {
    getState().updateDatasetSelectionAbortStatus(state);
};

/**
 * For the supplied (subset of) `fields`, Power BI data view `categories`
 * and `rowIndices`, attempt to generate an array of valid
 *  `powerbi.visuals.ISelectionId`.
 */
const createSelectionIds = (
    fields: IVisualDatasetFields,
    categories: DataViewCategoryColumn[],
    rowIndices: number[]
) => {
    let identities: ISelectionId[] = [];
    forEach(rowIndices, (ri) => {
        const identity = getSelectionIdBuilder();
        forEach(fields, (v) => {
            switch (true) {
                case v?.isMeasure: {
                    identity.withMeasure(v.queryName);
                    break;
                }
                default: {
                    identity.withCategory(categories[v.sourceIndex], ri);
                }
            }
        });
        identities.push(identity.createSelectionId());
    });
    return identities;
};

/**
 * For the given `ISelectionId`, confirm whether it is present in the supplied
 * `ISelectionId[]`. Typically used to confirm against the visual's selection
 * manager
 */
const getDataPointStatus = (
    id: ISelectionId,
    selection: ISelectionId[]
): TDataPointSelectionStatus =>
    (selection.find((sid) => sid.equals(id)) && 'on') ||
    (selection.length === 0 && 'neutral') ||
    'off';

/**
 * Get array of all data row indices for a supplied dataset.
 */
const getIdentityIndices = (data: IVegaViewDatum[]): number[] =>
    data?.map((d) => d?.[DATASET_ROW_NAME]);

/**
 * Get all values (excluding metadata) for current processed dataset from Deneb's store.
 */
const getValues = () => getDataset().values;

/**
 * Returns `getValues()`, but filtered for a supplied list `__row__` values.
 */
const getValuesByIndices = (indices: number[]) =>
    getValues().filter((v) => indices.indexOf(v?.[DATASET_ROW_NAME]) > -1);

/**
 * For the supplied (subset of) `field` and `datum`, attempt to find the
 * first matching row in the visual's processed dataset for this combination.
 * Note that if Vega/Vega-Lite applies a prefixed aggregate in the datum, we
 * can't reconcile this wihtout further processing. We could consider processing
 * for agg prefix, e.g. and seeing if we can match like this:
 *   (?:max|min|sum|argMax|argMin[etc...]_){1}(.*), but this may open up a whole
 * other can of worms, like having to match on an aggregated value and doing this
 * ourselves. I'll leave this here as a reminder to think about it.
 */
const getValuesForField = (
    field: IVisualDatasetFields,
    data: IVegaViewDatum[]
): IVisualDatasetValueRow[] => {
    const matches = getMatchedValues(field, data);
    if (matches?.length > 0) {
        return matches;
    }
    return getMatchedValues(
        pickBy(field, (md) => !md.isMeasure),
        data
    );
};

/**
 * For the supplied (subset of) `fields` and `data`, attempt to find any
 * matching rows in the visual's processed dataset for this combination.
 */
const getMatchedValues = (
    fields: IVisualDatasetFields,
    data: IVegaViewDatum[]
): IVisualDatasetValueRow[] => {
    const resolvedMd = resolveDatumForFields(fields, data?.[0]),
        matchedRows = getValues().filter(matches(resolvedMd));
    if (matchedRows.length > 0) {
        return matchedRows;
    }
    return (matchedRows.length > 0 && matchedRows) || null;
};

/**
 * Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's
 * store, so that we can use to to create selection IDs for data points.
 */
const getSelectionIdBuilder = () => hostServices.selectionIdBuilder();

/**
 * For a resolved `data` object from a Vega tooltip handler, attempt to identify
 * a valid Power BI selection ID that can be added to the tooltip call for any
 * report pages that Power BI may have for the selector. If there is no explicit
 * identity discoverable in the data, then it will attempt to create a selection
 * ID from the dataset and data view based on known values.
 *
 * Returns single item array containing valid `ISelectionId` (or `null` if a
 * selection ID cannot be resolved).
 */
const getSelectionIdentitiesFromData = (
    data: IVegaViewDatum[]
): ISelectionId[] => {
    const { dataset } = getState();
    switch (true) {
        case !data: {
            // Selection can/should be cleared
            return null;
        }
        case data?.length === 1 &&
            data[0].hasOwnProperty(DATASET_IDENTITY_NAME): {
            // Single, identifiable datum
            return [<ISelectionId>data[0]?.[DATASET_IDENTITY_NAME]];
        }
        case data?.length > 1 && allDataHasIdentities(data): {
            // Multiple data, and all can resolve to selectors
            return getSelectorsFromData(data);
        }
        default: {
            const metadata = getDatasetFieldsBySelectionKeys(
                    keys(data?.[0] || [])
                ),
                values = getValuesForField(metadata, data);
            if (values?.length === dataset.values.length) {
                // All rows selected, ergo we don't actually need to highlight; as per `!data` case above
                return null;
            }
            // Fall-through; return all selection IDs, or the ones we try to resolve.
            return (
                (values && getSelectorsFromData(values)) ||
                createSelectionIds(metadata, getCategoryColumns(), null)
            );
        }
    }
};

/**
 * For the supplied data, extract all `SelectionId`s into an array.
 */
const getSelectorsFromData = (
    data: IVegaViewDatum[] | IVisualDatasetValueRow[]
) =>
    getValuesByIndices(getIdentityIndices(data)).map(
        (v) => v?.[DATASET_IDENTITY_NAME]
    );

/**
 * We have some compatibility issues between `powerbi.extensibility.ISelectionId`
 * and `powerbi.visuals.ISelectionId`, as well as needing to coerce Selection
 * IDs to strings so that we can set initial selections for Vega-Lite (as objects
 * aren't supported). This consolidates the logic we're using to resolve a
 * Selection ID to a string representation suitable for use across the visual.
 */
const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());

/**
 * If a context menu event is fired over the visual, attempt to retrieve any
 * datum and associated identity, before displaying the context menu.
 *
 * Note that the context menu can only work with a single selector, so we will
 * only return a selector if it resolves to a single entry, otherwise drill
 * through doesn't actually result in the correct data being displayed in the
 * D/T page. This is currently observed in Charticulator and it looks like the
 * core visuals avoid this situation, so we'll try to do the same for now.
 */
const handleContextMenuEvent = (event: ScenegraphEvent, item: Item) => {
    event.stopPropagation();
    const { selectionManager } = hostServices,
        mouseEvent: MouseEvent = <MouseEvent>window.event,
        data = resolveDataFromItem(item),
        identities = getSelectionIdentitiesFromData(data),
        identity =
            (isContextMenuPropSet() &&
                identities?.length === 1 &&
                identities[0]) ||
            null;
    mouseEvent && mouseEvent.preventDefault();
    selectionManager.showContextMenu(identity, {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
    });
};

/**
 * If a click event is fired over the visual, attempt to retrieve any datum and
 * associated identity, before applying selection/cross-filtering.
 */
const handleDataPointEvent = (event: ScenegraphEvent, item: Item) => {
    event.stopPropagation();
    if (isDataPointPropSet()) {
        const mouseEvent: MouseEvent = <MouseEvent>window.event;
        const data = resolveDataFromItem(item);
        const identities = getSelectionIdentitiesFromData(data);
        mouseEvent && mouseEvent.preventDefault();
        hideTooltip();
        switch (true) {
            case isSelectionLimitExceeded(identities): {
                dispatchSelectionAborted(true);
                return;
            }
            case identities?.length > 0: {
                applySelection(identities);
                return;
            }
            default: {
                clearSelection();
                return;
            }
        }
    }
};

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature
 * switch is enabled via features.
 */
const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

/**
 * Allows us to validate for all key pre-requisites before we can bind a context
 * menu event to the visual.
 */
const isContextMenuPropSet = () => {
    const { enableContextMenu } = getVegaSettings();
    return (
        (isContextMenuEnabled &&
            enableContextMenu &&
            hostServices.allowInteractions) ||
        false
    );
};

/**
 * Convenience constant that confirms whether the `selectionDataPoint` feature
 * switch is enabled via features.
 */
const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

/**
 * Allows us to validate for all key pre-requisites before we can bind a context
 * menu event to the visual.
 */
const isDataPointPropSet = () => {
    const { enableSelection } = getVegaSettings();
    return (
        (isDataPointEnabled &&
            enableSelection &&
            hostServices.allowInteractions) ||
        false
    );
};

/**
 * Tests whether the current array of data points for selection exceeds the limit
 * we've imposed in our configuration.
 */
const isSelectionLimitExceeded = (identities: ISelectionId[]) => {
    const { selectionMaxDataPoints } = getVegaSettings();
    return identities?.length > selectionMaxDataPoints || false;
};

const isMultiSelect = () => {
    const mouseEvent: MouseEvent = <MouseEvent>window.event;
    return (mouseEvent.ctrlKey && true) || false;
};
