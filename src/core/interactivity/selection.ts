export {
    bindInteractivityEvents,
    clearSelection,
    createSelectionIds,
    dispatchSelectionAborted,
    getSelectionIdBuilder,
    getSelectionIdentitiesFromData,
    getSidString,
    isContextMenuEnabled,
    isDataPointEnabled,
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

import {
    allDataHaveIdentitites,
    getIdentityIndices,
    getMetadataByKeys,
    getValuesByIndices,
    getValuesForDatum,
    IVisualValueMetadata,
    IVisualValueRow,
    resolveDataFromItem
} from '../data/dataset';
import { isFeatureEnabled } from '../utils/features';
import { hostServices } from '../services';
import { IVegaViewDatum } from '../vega';
import { getState } from '../../store';
import { getCategoryColumns } from '../data/dataView';
import { TDataPointSelectionStatus } from '.';
import { hideTooltip } from './tooltip';
import { clearCatcherSelector } from '../ui/dom';

/**
 * Bind the interactivity events to the Vega view, based on feature switches and properties.
 */
const bindInteractivityEvents = (view: View) => {
    bindContextMenuEvents(view);
    bindDataPointEvents(view);
};

/**
 * For the supplied View, check conditions for context menu binding, and apply/remove as necessary.
 */
const bindContextMenuEvents = (view: View) => {
    view.addEventListener('contextmenu', handleContextMenuEvent);
    select(clearCatcherSelector(true)).on(
        'contextmenu',
        handleContextMenuEvent
    );
};

/**
 * For the supplied View, check conditions for data point selection binding, and apply/remove as necessary.
 */
const bindDataPointEvents = (view: View) => {
    if (isDataPointPropSet()) {
        view.addEventListener('click', handleDataPointEvent);
        select(clearCatcherSelector(true)).on('click', handleDataPointEvent);
    } else {
        view.removeEventListener('click', handleDataPointEvent);
        select(clearCatcherSelector(true)).on('click', null);
    }
};

/**
 * Handles clearing of visual data point selection state.
 */
const clearSelection = () => {
    hostServices.selectionManager.clear();
};

/**
 * Handle dispatch event for the 'selection blocked' message bar status to the store.
 */
const dispatchSelectionAborted = (state = false) => {
    getState().updateDatasetSelectionAbortStatus(state);
};

/**
 * For the supplied (subset of) `metadata`, Power BI data view `categories` and `rowIndices`, attempt to generate an array of valid
 * `powerbi.visuals.ISelectionId`.
 */
const createSelectionIds = (
    metadata: IVisualValueMetadata,
    categories: DataViewCategoryColumn[],
    rowIndices: number[]
) => {
    let identities: ISelectionId[] = [];
    forEach(rowIndices, (ri) => {
        const identity = getSelectionIdBuilder();
        forEach(metadata, (v) => {
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
 * For the given `ISelectionId`, confirm whether it is present in the supplied `ISelectionId[]`. Typically used to confirm
 * against the visual's selection manager
 */
const getDataPointStatus = (
    id: ISelectionId,
    selection: ISelectionId[]
): TDataPointSelectionStatus =>
    (selection.find((sid) => sid.equals(id)) && 'on') ||
    (selection.length === 0 && 'neutral') ||
    'off';

/**
 * Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's store, so that we can use to to create selection IDs for data points.
 */
const getSelectionIdBuilder = () => hostServices.selectionIdBuilder();

/**
 * For a resolved `data` object from a Vega tooltip handler, attempt to identify a valid Power BI selection ID that can be added to the tooltip call for any report pages
 * that Power BI may have for the selector. If there is no explicit identity discoverable in the data, then it will attempt to create a selection ID from the dataset and
 * data view based on known values.
 *
 * Returns single item array containing valid `ISelectionId` (or `null` if a selection ID cannot be resolved).
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
        case data?.length === 1 && data[0].hasOwnProperty('__identity__'): {
            // Single, identifiable datum
            return [<ISelectionId>data[0].__identity__];
        }
        case data?.length > 1 && allDataHaveIdentitites(data): {
            // Multiple data, and all can resolve to selectors
            return getSelectorsFromData(data);
        }
        default: {
            const metadata = getMetadataByKeys(keys(data?.[0] || [])),
                values = getValuesForDatum(metadata, data);
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
const getSelectorsFromData = (data: IVegaViewDatum[] | IVisualValueRow[]) =>
    getValuesByIndices(getIdentityIndices(data)).map((v) => v.__identity__);

/**
 * We have some compatibility issues between `powerbi.extensibility.ISelectionId` and `powerbi.visuals.ISelectionId`, as well as needing to coerce Selection
 * IDs to strings so that we can set initial selections for Vega-Lite (as objects aren't supported). This consolidates the logic we're using to resolve a
 * Selection ID to a string representation suitable for use across the visual.
 */
const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());

/**
 * If a context menu event is fired over the visual, attempt to retrieve any datum and associated identity, before displaying the context menu.
 *
 * Note that the context menu can only work with a single selector, so we will only return a selector if it resolves to a single entry, otherwise
 * drill through doesn't actually result in the correct data being displayed in the D/T page. This is currently observed in Charticulator and it looks
 * like the core visuals avoid this situation, so we'll try to do the same for now.
 */
const handleContextMenuEvent = (event: ScenegraphEvent, item: Item) => {
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
 * If a click event is fired over the visual, attempt to retrieve any datum and associated identity, before applying selection/cross-filtering.
 */
const handleDataPointEvent = (event: ScenegraphEvent, item: Item) => {
    const { selectionManager } = hostServices,
        mouseEvent: MouseEvent = <MouseEvent>window.event,
        data = resolveDataFromItem(item),
        identities = getSelectionIdentitiesFromData(data),
        selection = resolveSelectedIdentities(identities);
    const { updateDatasetSelectors } = getState();
    mouseEvent && mouseEvent.preventDefault();
    hideTooltip();
    switch (true) {
        case isSelectionLimitExceeded(selection): {
            dispatchSelectionAborted(true);
            return;
        }
        case selection.length > 0: {
            selectionManager.select(selection);
            updateDatasetSelectors(
                <ISelectionId[]>selectionManager.getSelectionIds()
            );
            return;
        }
        default: {
            clearSelection();
            updateDatasetSelectors(
                <ISelectionId[]>selectionManager.getSelectionIds()
            );
            return;
        }
    }
};

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

/**
 * Allows us to validate for all key pre-requisites before we can bind a context menu event to the visual.
 */
const isContextMenuPropSet = () => {
    const { enableContextMenu } = getState().visualSettings.vega;
    return (
        (isContextMenuEnabled &&
            enableContextMenu &&
            hostServices.allowInteractions) ||
        false
    );
};

/**
 * Convenience constant that confirms whether the `selectionDataPoint` feature switch is enabled via features.
 */
const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

/**
 * Allows us to validate for all key pre-requisites before we can bind a context menu event to the visual.
 */
const isDataPointPropSet = () => {
    const { enableSelection } = getState().visualSettings.vega;
    return (
        (isDataPointEnabled &&
            enableSelection &&
            hostServices.allowInteractions) ||
        false
    );
};

/**
 * Tests whether the current array of data points for selection exceeds the limit we've imposed in our configuration.
 */
const isSelectionLimitExceeded = (identities: ISelectionId[]) => {
    const { selectionMaxDataPoints } = getState().visualSettings.vega;
    return identities?.length > selectionMaxDataPoints || false;
};

/**
 * Resolve which identities should be passed to the selection manager, based on whether the user is holding the
 * `ctrl` key (multi-select), and whether existing selectors should be toggled on or off base don their presence
 * in the existing selection and the selection currently clicked on.
 */
const resolveSelectedIdentities = (identities: ISelectionId[]) => {
    if (!identities) {
        return [];
    }
    const mouseEvent: MouseEvent = <MouseEvent>window.event,
        current = <ISelectionId[]>(
            hostServices.selectionManager.getSelectionIds()
        ),
        merged =
            (mouseEvent.ctrlKey && [
                ...resolveIdentityIntersection(identities, current),
                ...resolveIdentityIntersection(current, identities)
            ]) ||
            identities;
    return (isEqual(identities, current) && []) || merged;
};

/**
 * For a given array of `ISelectionId`s, remove any that exist in a comparator (effectively toggling their state).
 */
const resolveIdentityIntersection = (
    source: ISelectionId[],
    comparator: ISelectionId[]
) => source.slice().filter((id) => !comparator.find((sid) => sid.equals(id)));
