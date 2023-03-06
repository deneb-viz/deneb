import powerbi from 'powerbi-visuals-api';
import PrimitiveValue = powerbi.PrimitiveValue;
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import { hostServices } from '../core/services';
import { ValueFormatterOptions } from 'powerbi-visuals-utils-formattingutils/lib/src/valueFormatter';

/**
 * Convenience function that creates a Power BI `valueFormatter.IValueFormatter` using the supplied format string, and using the visual's locale.
 * It is possible to override the formatter options, using an optional valid `ValueFormatterOptions` object.
 */
export const createFormatterFromString = (
    format: string,
    options: ValueFormatterOptions
) => {
    const formatOptions = {
        ...{
            format,
            cultureSelector: hostServices.locale
        },
        ...options
    };
    return valueFormatter.create(formatOptions);
};

/**
 * For the supplied value and Power BI format string, attempt to format it.
 */
export const powerBiFormatValue = (
    value: PrimitiveValue,
    format: string,
    options: ValueFormatterOptions = {}
) => createFormatterFromString(format, options).format(value);
