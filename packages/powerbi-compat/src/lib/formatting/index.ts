import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import type powerbi from 'powerbi-visuals-api';
import type { ValueFormatterOptions } from 'powerbi-visuals-utils-formattingutils/lib/src/valueFormatter';

/**
 * Create a Power BI `valueFormatter.IValueFormatter` for the supplied format
 * string. Exposed so hot paths that format many values sharing one format
 * string can create the formatter once and reuse it, rather than paying
 * `valueFormatter.create()` for every value.
 */
export const getValueFormatter = (
    format: string | undefined | null,
    options: ValueFormatterOptions = {}
) =>
    valueFormatter.create({
        format: format || '',
        ...options
    });

/**
 * For the supplied value and Power BI format string, attempt to format it.
 * Convenience wrapper around {@link getValueFormatter} that creates a formatter
 * per call — prefer reusing a `getValueFormatter` result when formatting many
 * values with the same format string.
 */
export const getFormattedValue = (
    value: powerbi.PrimitiveValue | undefined | null,
    format: string | undefined | null,
    options: ValueFormatterOptions = {}
) => getValueFormatter(format, options).format(value);
