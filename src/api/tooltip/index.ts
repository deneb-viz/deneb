export { getTooltipHandler, isHandlerEnabled };

import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.extensibility.ISelectionId;

import indexOf from 'lodash/indexOf';
import keys from 'lodash/keys';
import pickBy from 'lodash/pickBy';
import toNumber from 'lodash/toNumber';

import { getMetadataByKeys, getValueForDatum } from '../dataset';
import { getCategoryColumns } from '../dataView';
import { resolveCoordinates } from '../event';
import { isFeatureEnabled } from '../features';
import { createFormatterFromString } from '../formatting';
import { createSelectionId } from '../selection';
import { resolveDatumForKeywords } from '../../core/interactivity';
import { IVegaViewDatum } from '../../core/vega';
import { getSanitisedTooltipValue } from '../../core/interactivity/tooltip';

const getTooltipHandler = (
    isSettingEnabled: boolean,
    tooltipService: ITooltipService
) =>
    (isHandlerEnabled &&
        isSettingEnabled &&
        resolveTooltipContent(tooltipService)) ||
    undefined;

const isHandlerEnabled = isFeatureEnabled('tooltipHandler');

const extractTooltipDataItemsFromObject = (
    tooltip: Object,
    autoFormatFields: IVegaViewDatum
): VisualTooltipDataItem[] => {
    const autoFormatMetadata = getMetadataByKeys(keys(autoFormatFields));
    return resolveDatumForKeywords(tooltip).map(([k, v]) => ({
        displayName: `${k}`,
        value: `${
            (autoFormatMetadata[k] &&
                createFormatterFromString(autoFormatMetadata[k].format).format(
                    (autoFormatMetadata[k].type.numeric && toNumber(v)) ||
                        (autoFormatMetadata[k].type.dateTime && v)
                )) ||
            getSanitisedTooltipValue(v)
        }`
    }));
};

const getFieldsEligibleForAutoFormat = (tooltip: Object) =>
    pickBy(tooltip, (v, k) => {
        const ttKeys = keys(tooltip),
            mdKeys = keys(getMetadataByKeys(ttKeys));
        return (
            indexOf(mdKeys, k) > -1 &&
            isResolveNumberFormatEnabled() &&
            toNumber(tooltip[k])
        );
    });

const getTooltipIdentity = (datum: IVegaViewDatum): [ISelectionId] => {
    const datumId = datum?.__identity__;
    if (datumId) return [<ISelectionId>datumId];
    // Try and create a selection ID from fields/values that can be resolved from datum
    const metadata = getMetadataByKeys(keys(datum)),
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

const isResolveNumberFormatEnabled = () =>
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
        console.clear();
        const datum = { ...item.datum },
            tooltip = { ...item.tooltip },
            autoFormatFields = getFieldsEligibleForAutoFormat(tooltip),
            dataItems = extractTooltipDataItemsFromObject(
                tooltip,
                autoFormatFields
            ),
            identities = getTooltipIdentity(datum);
        console.log('DATUM', datum);
        console.log('TT', tooltip);
        console.log('FORMAT', autoFormatFields);
        console.log('ITEMS', dataItems);
        console.log('IDs', identities);
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
