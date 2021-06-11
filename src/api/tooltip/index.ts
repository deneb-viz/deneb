export { getTooltipHandler, isHandlerEnabled };

import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.extensibility.ISelectionId;

import _ from 'lodash';

import { getMetadataByKeys, getValueForDatum } from '../dataset';
import { getCategoryColumns } from '../dataView';
import { resolveCoordinates } from '../event';
import { isFeatureEnabled } from '../features';
import { createFormatterFromString } from '../formatting';
import {
    createSelectionId,
    resolveDatumForKeywords,
    IVegaViewDatum
} from '../selection';

const extractTooltipDataItemsFromObject = (
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

const getFieldsEligibleForAutoFormat = (tooltip: Object) =>
    _.pickBy(tooltip, (v, k) => {
        const ttKeys = _.keys(tooltip),
            mdKeys = _.keys(getMetadataByKeys(ttKeys));
        return (
            _(mdKeys).indexOf(k) > -1 &&
            isResolveNumberFormatEnabled &&
            _.toNumber(tooltip[k])
        );
    });

const getTooltipHandler = (
    isSettingEnabled: boolean,
    tooltipService: ITooltipService
) =>
    (isHandlerEnabled &&
        isSettingEnabled &&
        resolveTooltipContent(tooltipService)) ||
    undefined;

const getTooltipIdentity = (datum: IVegaViewDatum): [ISelectionId] => {
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

function hideTooltip(tooltipService: ITooltipService) {
    const immediately = true;
    tooltipService.hide({
        immediately,
        isTouchEvent
    });
}

const isHandlerEnabled = isFeatureEnabled('tooltipHandler');

const isResolveNumberFormatEnabled =
    isHandlerEnabled && isFeatureEnabled('tooltipResolveNumberFieldFormat');

const isTouchEvent = true;

const resolveTooltipContent = (tooltipService: ITooltipService) => (
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
