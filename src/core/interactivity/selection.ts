export {
    bindContextMenuEvents,
    createSelectionIds,
    getSelectionIdBuilder,
    getSelectionIdentitiesFromData,
    getSidString,
    isContextMenuEnabled,
    isDataPointEnabled
};

import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { View, ScenegraphEvent, Item } from 'vega';
import forEach from 'lodash/foreach';
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

/**
 * For the supplied View, check conditions for contezxt menu binding, and apply/remove as necessary.
 */
const bindContextMenuEvents = (view: View) => {
    if (isContextMenuPropSet()) {
        view.addEventListener('contextmenu', handleContextMenuEvent);
    } else {
        view.removeEventListener('contextmenu', handleContextMenuEvent);
    }
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
 * Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's Redux store, so that we can use to to create selection IDs for data points.
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
    switch (true) {
        case data?.length === 1 && data[0].hasOwnProperty('__identity__'): {
            return [<ISelectionId>data[0].__identity__];
        }
        case data?.length > 1 && allDataHaveIdentitites(data): {
            return getSelectorsFromData(data);
        }
        default: {
            const metadata = getMetadataByKeys(keys(data?.[0] || [])),
                values = getValuesForDatum(metadata, data);
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
 * IDs to strings so that we can set intial selections for Vega-Lite (as objects aren't supported). This consolidates the logic we're using to resolve a
 * Selection ID to a string representation suitable for use across the visual.
 */
const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());

/**
 * If a context menu event is fired over the visual, attempt to retrieve any datum and associated identity, before displaying the context menu.
 *
 * Note that the context menu can only work with a single selector, so we will only return a selector if it resolves to a single entry, otherwise
 * drillthrough doesn't actually result in the correct data being displayed in the D/T page. This is currently observed in Charticulator and it looks
 * like the core visuals avoid this situation, so we'll try to do the same for now.
 */
const handleContextMenuEvent = (event: ScenegraphEvent, item: Item) => {
    const { selectionManager } = hostServices,
        mouseEvent: MouseEvent = <MouseEvent>window.event,
        data = resolveDataFromItem(item),
        identities = getSelectionIdentitiesFromData(data),
        identity = (identities.length === 1 && identities[0]) || null;
    mouseEvent && mouseEvent.preventDefault();
    selectionManager.showContextMenu(identity, {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
    });
};

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

/**
 * Allows us to validate for all key pre-requisites before we can bind a context menu event to the visual.
 */
const isContextMenuPropSet = () => {
    const { allowInteractions, settings } = getState().visual,
        { enableContextMenu } = settings?.vega;
    return (
        (isContextMenuEnabled && enableContextMenu && allowInteractions) ||
        false
    );
};

/**
 * Convenience constant that confirms whether the `selectionDataPoint` feature switch is enabled via features.
 */
const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');
