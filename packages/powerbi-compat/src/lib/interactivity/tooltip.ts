import powerbi from 'powerbi-visuals-api';
import { type TooltipHandler } from 'vega';

import { type VegaDatum, type TooltipHandlerOptions } from './types';
import { IDatasetFields } from '../dataset';
import {
    isPotentialCrossFilterMultiSelectEvent,
    resolveCoordinates
} from './event';
import { InteractivityManager } from './interactivity-manager';
import {
    getDatasetFieldsBySelectionKeys,
    getResolvedRowIdentities,
    resolveDatumFromItem
} from './data-point';
import { isDate, isObject } from '@deneb-viz/utils/inspection';
import {
    getPrunedObject,
    pickBy,
    stringifyPruned
} from '@deneb-viz/utils/object';
import { getFormattedValue } from '../formatting';
import { toDate, toNumber } from '@deneb-viz/utils/type-conversion';

/**
 * In order to create suitable output for tooltips and debugging tables. Because Power BI tooltips suppress standard
 * whitespace, we're substituting a unicode character that is visually similar to a space, but is not caught by the
 * tooltip handler.
 */
const TOOLTIP_WHITESPACE_CHAR = '\u2800';

/**
 * Create a Vega tooltip handler function that is compatible with Power BI tooltips.
 */
export const tooltipHandler = (
    options: TooltipHandlerOptions
): TooltipHandler | undefined => {
    const { enabled, fields, multiSelectDelay, values } = options;
    if (!enabled) {
        return undefined;
    }
    return (_, event, item, value) => {
        if (item && value) {
            const coordinates = resolveCoordinates(event);
            const data = resolveDatumFromItem(item);
            const rowNumbers = getResolvedRowIdentities(data, {
                fields,
                values
            });
            const ttToProcess = getResolvedTooltipContent(value);
            const autoFormatFields = getFieldsEligibleForAutoFormat(
                ttToProcess,
                fields
            );
            const dataItems = getObjectAsTooltipItems(
                ttToProcess,
                fields,
                autoFormatFields
            );
            const waitFor =
                (isPotentialCrossFilterMultiSelectEvent(event) &&
                    multiSelectDelay) ||
                0;
            InteractivityManager.showTooltip(
                dataItems,
                rowNumbers,
                coordinates,
                waitFor
            );
        } else {
            InteractivityManager.hideTooltip();
        }
    };
};

/**
 * For given Vega `tooltip` object (key-value pairs), return an object of fields from the visual dataset's metadata
 * that are in the tooltip, and eligible for automatic formatting. Eligibility criteria is as follows:
 *
 *  - The field display name has a corresponding entry in the visual dataset's metadata, and:
 *  - The field is a number type, and:
 *  - The tooltip value exactly matches the number representation in the `datum`.
 */
const getFieldsEligibleForAutoFormat = (
    tooltip: Record<string, unknown>,
    fields: IDatasetFields
): VegaDatum =>
    pickBy(tooltip, (v, k) => {
        const ttKeys = Object.keys(tooltip);
        const dsFields = getDatasetFieldsBySelectionKeys(fields, ttKeys);
        const mdKeys = Object.keys(dsFields);
        const isSourceFieldNumeric = dsFields[k]?.type?.numeric || false;
        const isTooltipFieldNumeric =
            isSourceFieldNumeric && !isNaN(v as number);
        const isEligible =
            mdKeys.indexOf(k) > -1 &&
            isSourceFieldNumeric &&
            isTooltipFieldNumeric;
        return isEligible;
    });

/**
 * Convert a flat object into an array of Power BI tooltip data items, applying formatting where appropriate.
 */
const getObjectAsTooltipItems = (
    obj: Record<string, unknown>,
    fields: IDatasetFields,
    autoFormatFields: VegaDatum
) => {
    const items: powerbi.extensibility.VisualTooltipDataItem[] = [];
    const autoFormatMetadata = getDatasetFieldsBySelectionKeys(
        fields,
        Object.keys(autoFormatFields)
    );
    Object.entries(obj).forEach(([key, val]) => {
        const primitiveValue = val as powerbi.PrimitiveValue;
        const isValueDate = autoFormatMetadata[key]?.type?.dateTime;
        const isValueNumeric = autoFormatMetadata[key]?.type?.numeric;
        const value =
            isValueDate || isValueNumeric
                ? getFormattedValue(
                      isValueDate
                          ? toDate(primitiveValue)
                          : toNumber(primitiveValue),
                      autoFormatMetadata[key]?.format
                  )
                : getSanitizedTooltipValue(val);
        items.push({
            displayName: `${key}`,
            value
        });
    });
    return items;
};

/**
 * Take resolved data from a Vega tooltip and ensure its shape matches the expectations of a Power BI tooltip.
 *
 * If the value is not an object, we create a single-entry object with a blank key and the stringified value. Otherwise
 * we prune the object to a sensible level to remove any nested structures or circular references.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getResolvedTooltipContent = (value: any) => {
    if (!isObject(value)) {
        return { ' ': `${value}` };
    }
    return getPrunedObject(value);
};

/**
 * Ensure that tooltip values are correctly sanitized for output into a default tooltip.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSanitizedTooltipValue = (value: any) =>
    isObject(value) && !isDate(value)
        ? stringifyPruned(value, {
              whitespaceChar: TOOLTIP_WHITESPACE_CHAR
          })
        : `${value}`;
