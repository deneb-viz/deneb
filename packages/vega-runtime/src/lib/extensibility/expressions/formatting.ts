import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import { isObject } from '@deneb-viz/utils/inspection';

/**
 * For the supplied value, and format string, apply Power BI-specific formatting to it.
 */
export const pbiFormat = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datum: any,
    params: string | null | valueFormatter.ValueFormatterOptions,
    options: valueFormatter.ValueFormatterOptions = {}
) => {
    if (isObject(params)) {
        return getFormattedValue(
            datum,
            null,
            <valueFormatter.ValueFormatterOptions>params
        );
    }
    return getFormattedValue(
        datum,
        params === null ? null : `${params}`,
        options
    );
};

/**
 * Convenience function that applies Power BI formatting to a number, but re-passes the value, invoking auto-
 * formatting. This is analogous to the "Auto" option in the Power BI formatting pane.
 */
export const pbiFormatAutoUnit = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datum: any,
    params: string | null | valueFormatter.ValueFormatterOptions,
    options: valueFormatter.ValueFormatterOptions = {}
) => {
    if (isObject(params)) {
        return pbiFormat(datum, null, <valueFormatter.ValueFormatterOptions>{
            ...(params as valueFormatter.ValueFormatterOptions),
            ...{ value: datum }
        });
    }
    return getFormattedValue(
        datum,
        <string>params,
        <valueFormatter.ValueFormatterOptions>{
            ...options,
            ...{ value: datum }
        }
    );
};
