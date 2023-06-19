import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import delay from 'lodash/delay';
import indexOf from 'lodash/indexOf';
import isDate from 'lodash/isDate';
import isObject from 'lodash/isObject';
import keys from 'lodash/keys';
import pickBy from 'lodash/pickBy';
import toNumber from 'lodash/toNumber';
import toString from 'lodash/toString';

import { i18nValue } from '../../core/ui/i18n';
import {
    getJsonAsIndentedString,
    stringifyPruned
} from '../../core/utils/json';
import { getVegaSettings, IVegaViewDatum } from '../../core/vega';
import { powerBiFormatValue } from '../../utils';
import {
    getDatasetFieldsBySelectionKeys,
    getIdentitiesFromData,
    resolveDataFromItem
} from './data-point';
import { isFeatureEnabled } from '../../core/utils/features';
import { hostServices } from '../../core/services';
import { DATASET_IDENTITY_NAME, DATASET_KEY_NAME } from '../../constants';

/**
 * Convenience constant for tooltip events, as it's required by Power BI.
 */
const IS_TOUCH_EVENT = true;

/**
 * Convenience constant that confirms whether the `tooltipHandler` feature switch is enabled via features.
 */
export const IS_TOOLTIP_HANDLER_ENABLED = isFeatureEnabled('tooltipHandler');

/**
 * Array of reserved keywords used to handle selection IDs from the visual's
 * default data view.
 */
const TOOLTIP_RESERVED_WORDS = [DATASET_IDENTITY_NAME, DATASET_KEY_NAME];

/**
 * For a given Vega `tooltip` object (key-value pairs), extract any non-reserved keys, and structure suitably as an array of standard
 * Power BI tooltip items (`VisualTooltipDataItem[]`).
 */
const extractTooltipDataItemsFromObject = (
    tooltip: object,
    autoFormatFields: IVegaViewDatum
): VisualTooltipDataItem[] => {
    const autoFormatMetadata = getDatasetFieldsBySelectionKeys(
        keys(autoFormatFields)
    );
    return resolveDatumToArray(tooltip, false).map(([k, v]) => ({
        displayName: `${k}`,
        value: `${
            (autoFormatMetadata[k] &&
                powerBiFormatValue(
                    (autoFormatMetadata[k].type.numeric && toNumber(v)) ||
                        (autoFormatMetadata[k].type.dateTime && v),
                    autoFormatMetadata[k].format
                )) ||
            getCuratedTooltipItem(k, getSanitisedTooltipValue(v))
        }`
    }));
};

/**
 * For a given tooltip item, if it's a reserved workd, return something more sensible to the end user than a complex object.
 */
const getCuratedTooltipItem = (key: string, value: any) =>
    isTooltipReservedWord(key)
        ? i18nValue('Selection_KW_Present')
        : getDeepRedactedTooltipItem(value);

/**
 * Sometimes, we can fudge the aggregates or other operations to create deeply nested objects in our dataset. This will apply a deeper,
 * recursive search and replace of keys matching out interactivity reserved words and 'redact' them with indicators for tooltips.
 */
const getDeepRedactedTooltipItem = (object: object) => {
    return Array.isArray(object)
        ? object.map(getDeepRedactedTooltipItem)
        : object && typeof object === 'object'
        ? Object.fromEntries(
              Object.entries(object).map(([k, v]) => [
                  k,
                  getCuratedTooltipItem(k, v)
              ])
          )
        : object;
};

/**
 * For given Vega `tooltip` object (key-value pairs), return an object of fields from the visual dataset's metadata that are in the tooltip,
 * and eligible for automatic formatting. Eligibility criteria is as follows:
 *
 *  - The `tooltipResolveNumberFieldFormat` feature is enabled, and:
 *  - The field display name has a corresponding entry in the visual datset's metadata, and:
 *  - The field is a number type, and:
 *  - The tooltip value exactly matches the number representation in the `datum`.
 */
const getFieldsEligibleForAutoFormat = (tooltip: object) =>
    pickBy(tooltip, (v, k) => {
        const ttKeys = keys(tooltip),
            mdKeys = keys(getDatasetFieldsBySelectionKeys(ttKeys));
        return (
            indexOf(mdKeys, k) > -1 &&
            isResolveNumberFormatEnabled() &&
            toNumber(tooltip[k])
        );
    });

/**
 * Ensure that tooltip values are correctly sanitised for output into a default tooltip.
 */
export const getSanitisedTooltipValue = (value: any) =>
    isObject(value) && !isDate(value)
        ? getJsonAsIndentedString(getDeepRedactedTooltipItem(value), 'tooltip')
        : toString(value);

/**
 * Get a new custom Vega tooltip handler for Power BI. If the supplied setting is enabled, will return a `resolveTooltipContent` handler
 * for the supplied `tooltipService`.
 */
export const getPowerBiTooltipHandler = (
    isSettingEnabled: boolean,
    tooltipService: ITooltipService
) =>
    (IS_TOOLTIP_HANDLER_ENABLED &&
        isSettingEnabled &&
        resolveTooltipContent(tooltipService)) ||
    undefined;

/**
 * Request Power BI hides the tooltip.
 */
export const hidePowerBiTooltip = () => {
    const immediately = true;
    hostServices.tooltipService.hide({
        immediately,
        isTouchEvent: IS_TOUCH_EVENT
    });
};

/**
 *  Confirms whether the `tooltipResolveNumberFieldFormat` feature switch is enabled via features.
 */
const isResolveNumberFormatEnabled = () =>
    IS_TOOLTIP_HANDLER_ENABLED &&
    isFeatureEnabled('tooltipResolveNumberFieldFormat');

/**
 * Helper method to determine if a supplied key (string) is reserved for
 * interactivity purposes.
 */
const isTooltipReservedWord = (word: string) =>
    TOOLTIP_RESERVED_WORDS.indexOf(word) > -1;

/**
 *For the supplied event, returns an [x, y] array of mouse coordinates.
 */
export const resolveCoordinates = (event: MouseEvent): [number, number] => [
    event?.clientX,
    event?.clientY
];

/**
 * For a given datum, resolve it to an array of keys and values. Additionally, we can (optionally) ensure that the
 * `interactivityReservedWords` are stripped out so that we can get actual fields and values assigned to a datum.
 */
const resolveDatumToArray = (obj: IVegaViewDatum, filterReserved = true) =>
    Object.entries({ ...obj }).filter(
        ([k]) => (filterReserved && !isTooltipReservedWord(k)) || k
    );

/**
 * For the supplied Power BI `ITooltipService` service instance from the visual host, apply the `vegaTooltip` object
 * (https://github.com/vega/vega-tooltip/blob/master/docs/APIs.md) supplied by the Vega view and attempt to show or hide a Power BI tooltip
 * based on its contents.
 */
const resolveTooltipContent =
    (tooltipService: ITooltipService) =>
    (handler: any, event: MouseEvent, item: any) => {
        const coordinates = resolveCoordinates(event);
        if (item && item.tooltip) {
            const datum = resolveDataFromItem(item);
            const tooltip = resolveTooltipItem(item.tooltip);
            const autoFormatFields = getFieldsEligibleForAutoFormat(tooltip);
            const dataItems = extractTooltipDataItemsFromObject(
                tooltip,
                autoFormatFields
            );
            const identities = getIdentitiesFromData(datum);
            const { tooltipDelay } = getVegaSettings();
            const waitFor = (event.ctrlKey && tooltipDelay) || 0;
            const options = {
                coordinates,
                dataItems,
                isTouchEvent: IS_TOUCH_EVENT,
                identities
            };
            switch (event.type) {
                case 'mouseover':
                case 'mousemove': {
                    delay(() => tooltipService.show(options), waitFor);
                    break;
                }
                default: {
                    hidePowerBiTooltip();
                }
            }
        } else {
            hidePowerBiTooltip();
        }
    };

/**
 * Because Power BI tooltips require key/value pairs, this processes scalar
 * values we receive from Vega signals into something that can work.
 */
const resolveTooltipItem = (tooltip: any) => {
    switch (true) {
        case typeof tooltip !== 'object':
            return { ' ': `${tooltip}` };
        default:
            return JSON.parse(stringifyPruned(tooltip));
    }
};
