export { getTooltipHandler, isHandlerEnabled };

import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.extensibility.ISelectionId;

import indexOf from 'lodash/indexOf';
import isObject from 'lodash/isObject';
import keys from 'lodash/keys';
import pickBy from 'lodash/pickBy';
import reduce from 'lodash/reduce';
import toNumber from 'lodash/toNumber';
import toString from 'lodash/toString';

import {
    isInteractivityReservedWord,
    resolveCoordinates,
    resolveDatumForKeywords
} from '.';
import { i18nValue } from '../ui/i18n';
import { getJsonAsIndentedString } from '../utils/json';
import { IVegaViewDatum } from '../vega';

import { isFeatureEnabled } from '../utils/features';
import { createSelectionId } from './selection';
import { getMetadataByKeys, getValueForDatum } from '../data/dataset';
import { createFormatterFromString } from '../utils/formatting';
import { getCategoryColumns } from '../data/dataView';

/**
 * Convenience constant for tooltip events, as it's required by Power BI.
 */
const isTouchEvent = true;

/**
 * Convenience constant that confirms whether the `tooltipHandler` feature switch is enabled via features.
 */
const isHandlerEnabled = isFeatureEnabled('tooltipHandler');

/**
 *  Confirms whether the `tooltipResolveNumberFieldFormat` feature switch is enabled via features.
 */
const isResolveNumberFormatEnabled = () =>
    isHandlerEnabled && isFeatureEnabled('tooltipResolveNumberFieldFormat');

/**
 * For a given Vega `tooltip` object (key-value pairs), extract any non-reserved keys, and structure suitably as an array of standard Power BI tooltip items (`VisualTooltipDataItem[]`).
 */
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

/**
 * For given Vega `tooltip` object (key-value pairs), return an object of fields from the visual dataset's metadata that are in the tooltip, and eligible for automatic formatting. Eligibility criteria is as follows:
 *
 *  - The `tooltipResolveNumberFieldFormat` feature is enabled, and:
 *  - The field display name has a corresponding entry in the visual datset's metadata, and:
 *  - The field is a number type, and:
 *  - The tooltip value exactly matches the number representation in the `datum`.
 */
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

/**
 * 'Redact' any interactivity values to flag that they are present rather than exposing them completely.
 */
const getRedactedTooltipObject = (object: Object) =>
    reduce(
        object,
        (result, value, key) => {
            result[key] = isInteractivityReservedWord(key)
                ? i18nValue('Selection_KW_Present')
                : value;
            return result;
        },
        {}
    );

/**
 * Ensure that tooltip values are correctly sanitised for output into a default tooltip.
 */
const getSanitisedTooltipValue = (value: any) =>
    isObject(value)
        ? getJsonAsIndentedString(getRedactedTooltipObject(value), 'tooltip')
        : toString(value);

/**
 * Get a new custom Vega tooltip handler for Power BI. If the supplied setting is enabled, will return a `resolveTooltipContent` handler for the supplied `tooltipService`.
 */
const getTooltipHandler = (
    isSettingEnabled: boolean,
    tooltipService: ITooltipService
) =>
    (isHandlerEnabled &&
        isSettingEnabled &&
        resolveTooltipContent(tooltipService)) ||
    undefined;

/**
 * For a supplied `datum` object from a Vega tooltip handler, attempt to identify a valid Power BI selection ID that can be added to the tooltip call for any report pages
 * that Power BI may have for the selector. If there is no explicit identity discoverable in the datum, then it will attempt to create a selection ID from the dataset and
 * data view based on known values.
 *
 * Returns single item array containing valid `ISelectionId` (or `null` if a selection ID cannot be resolved).
 */
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

/**
 * Request Power BI hides the tooltip.
 */
const hideTooltip = (tooltipService: ITooltipService) => {
    const immediately = true;
    tooltipService.hide({
        immediately,
        isTouchEvent
    });
};

/**
 * For the supplied Power BI `ITooltipService` service instance from the visual host, apply the `vegaTooltip` object (https://github.com/vega/vega-tooltip/blob/master/docs/APIs.md)
 * supplied by the Vega view and attempt to show or hide a Power BI tooltip based on its contents.
 */
const resolveTooltipContent =
    (tooltipService: ITooltipService) =>
    (handler: any, event: MouseEvent, item: any, value: any) => {
        const coordinates = resolveCoordinates(event);
        if (item) {
            // console.clear();
            const datum = { ...item.datum },
                tooltip = { ...item.tooltip },
                autoFormatFields = getFieldsEligibleForAutoFormat(tooltip),
                dataItems = extractTooltipDataItemsFromObject(
                    tooltip,
                    autoFormatFields
                ),
                identities = getTooltipIdentity(datum);
            // console.log('DATUM', datum);
            // console.log('TT', tooltip);
            // console.log('FORMAT', autoFormatFields);
            // console.log('ITEMS', dataItems);
            // console.log('IDs', identities);
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
