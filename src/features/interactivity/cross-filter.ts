import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import { ScenegraphEvent, Item } from 'vega';
import { hostServices } from '../../core/services';

import { isFeatureEnabled } from '../../core/utils/features';
import { getVegaSettings } from '../../core/vega';
import { hidePowerBiTooltip } from './tooltip';
import { getState } from '../../store';
import { getIdentitiesFromData, resolveDataFromItem } from './data-point';
import { TDataPointSelectionStatus } from './types';

/**
 * Convenience constant that confirms whether the `selectionDataPoint` feature
 * switch is enabled via features.
 */
export const IS_CROSS_FILTER_ENABLED = isFeatureEnabled('selectionDataPoint');

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
 * Handles clearing of visual data point selection state.
 */
export const clearSelection = () => {
    const { updateDatasetSelectors } = getState();
    hostServices.selectionManager
        .clear()
        .then(() => updateDatasetSelectors([]));
};

/**
 * Handle dispatch event for the 'selection blocked' message bar status to the
 * store.
 */
export const dispatchCrossFilterAbort = (state = false) => {
    getState().updateDatasetSelectionAbortStatus(state);
};

/**
 * For the given `ISelectionId`, confirm whether it is present in the supplied
 * `ISelectionId[]`. Typically used to confirm against the visual's selection
 * manager
 */
export const getDataPointCrossFilterStatus = (
    id: ISelectionId,
    selection: ISelectionId[]
): TDataPointSelectionStatus =>
    (selection.find((sid) => sid.equals(id)) && 'on') ||
    (selection.length === 0 && 'neutral') ||
    'off';

/**
 * Because existing identities are known to the visual host, we need to combine
 * this quantity and the identities that we're looking to add to this. If this
 * exceeds the maximum, then we should refuse it.
 */
const getPotentialSelectionSize = (identities: ISelectionId[]) =>
    (identities?.length || 0) +
    (hostServices.selectionManager.getSelectionIds()?.length || 0);

/**
 * Allows us to validate for all key pre-requisites before we can bind a context
 * menu event to the visual.
 */
export const isCrossFilterPropSet = () => {
    const { enableSelection } = getVegaSettings();
    return (
        (IS_CROSS_FILTER_ENABLED &&
            enableSelection &&
            hostServices.allowInteractions) ||
        false
    );
};

/**
 * If a click event is fired over the visual, attempt to retrieve any datum and
 * associated identity, before applying selection/cross-filtering.
 */
export const handleCrossFilterEvent = (event: ScenegraphEvent, item: Item) => {
    event.stopPropagation();
    if (isCrossFilterPropSet()) {
        const mouseEvent: MouseEvent = <MouseEvent>window.event;
        const data = resolveDataFromItem(item);
        const identities = getIdentitiesFromData(data);
        mouseEvent && mouseEvent.preventDefault();
        hidePowerBiTooltip();
        switch (true) {
            case isEventTargetParam(mouseEvent): {
                return;
            }
            case isSelectionLimitExceeded(identities): {
                dispatchCrossFilterAbort(true);
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
 * Determine if the event comes from a param in the view.
 */
const isEventTargetParam = (event: MouseEvent) =>
    (<HTMLInputElement>event?.target)?.matches('input, select');

/**
 * Determine if the window is in multi-select state, i.e. ctrl key is held
 * down by user.
 */
const isMultiSelect = () => {
    const mouseEvent: MouseEvent = <MouseEvent>window.event;
    return (mouseEvent.ctrlKey && true) || false;
};

/**
 * Tests whether the current array of data points for selection exceeds the limit
 * we've imposed in our configuration.
 */
const isSelectionLimitExceeded = (identities: ISelectionId[]) => {
    const { selectionMaxDataPoints } = getVegaSettings();
    const length = getPotentialSelectionSize(identities);
    return length > selectionMaxDataPoints || false;
};
