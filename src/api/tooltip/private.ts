import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.extensibility.ISelectionId;

import _ from 'lodash';

import { getMetadataByKeys, getValueForDatum } from '../dataset/public';
import { getCategoryColumns } from '../dataView/public';
import { resolveCoordinates } from '../event/public';
import { isFeatureEnabled } from '../features/public';
import { createFormatterFromString } from '../formatting/public';
import {
    createSelectionId,
    resolveDatumForKeywords,
    IVegaViewDatum
} from '../selection/public';
import { isHandlerEnabled } from './public';

export const extractTooltipDataItemsFromObject = (
    tooltip: Object,
    autoFormatFields: IVegaViewDatum
): VisualTooltipDataItem[] => {
    const autoFormatMetadata = getMetadataByKeys(_.keys(autoFormatFields));
    return resolveDatumForKeywords(tooltip).map(([k, v]) => ({
        displayName: `${k}`,
        value: `${
            (autoFormatMetadata[k] &&
                createFormatterFromString(autoFormatMetadata[k].format).format(
                    _.toNumber(v)
                )) ||
            v
        }`
    }));
};

export const getFieldsEligibleForAutoFormat = (tooltip: Object) =>
    _.pickBy(tooltip, (v, k) => {
        const ttKeys = _.keys(tooltip),
            mdKeys = _.keys(getMetadataByKeys(ttKeys));
        return (
            _(mdKeys).indexOf(k) > -1 &&
            isResolveNumberFormatEnabled() &&
            _.toNumber(tooltip[k])
        );
    });

export const getTooltipIdentity = (datum: IVegaViewDatum): [ISelectionId] => {
    const datumId = datum?.__identity__;
    if (datumId) return [<ISelectionId>datumId];
    // Try and create a selection ID from fields/values that can be resolved from datum
    const metadata = getMetadataByKeys(_.keys(datum)),
        value = getValueForDatum(metadata, datum),
        categories = getCategoryColumns(),
        selectionId =
            value &&
            createSelectionId(metadata, categories, value.identityIndex);
    return selectionId ? [selectionId] : null;
};

export function hideTooltip(tooltipService: ITooltipService) {
    const immediately = true;
    tooltipService.hide({
        immediately,
        isTouchEvent
    });
}

export const isResolveNumberFormatEnabled = () =>
    isHandlerEnabled && isFeatureEnabled('tooltipResolveNumberFieldFormat');

const isTouchEvent = true;

export const resolveTooltipContent = (tooltipService: ITooltipService) => (
    handler: any,
    event: MouseEvent,
    item: any,
    value: any
) => {
    const coordinates = resolveCoordinates(event);
    if (item) {
        const datum = { ...item.datum },
            tooltip = { ...item.tooltip },
            autoFormatFields = getFieldsEligibleForAutoFormat(tooltip),
            dataItems = extractTooltipDataItemsFromObject(
                tooltip,
                autoFormatFields
            ),
            identities = getTooltipIdentity(datum);
        switch (event.type) {
            case 'mouseover':
            case 'mousemove': {
                tooltipService.show({
                    coordinates,
                    dataItems,
                    isTouchEvent,
                    identities
                });
                break;
            }
            default: {
                hideTooltip(tooltipService);
            }
        }
    } else {
        hideTooltip(tooltipService);
    }
};
