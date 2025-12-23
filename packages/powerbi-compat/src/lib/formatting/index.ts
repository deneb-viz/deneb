import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import type powerbi from 'powerbi-visuals-api';
import type { ValueFormatterOptions } from 'powerbi-visuals-utils-formattingutils/lib/src/valueFormatter';

/**
 * Convenience function that creates a Power BI `valueFormatter.IValueFormatter` using the supplied format string, with
 * optional overrides. This helper is host-agnostic and can be safely used outside of Power BI (types only).
 */
const createFormatterFromString = (
    format: string | undefined | null,
    options: ValueFormatterOptions
) => {
    const formatOptions: ValueFormatterOptions = {
        format: format || '',
        ...options
    };
    return valueFormatter.create(formatOptions);
};

/**
 * For the supplied value and Power BI format string, attempt to format it.
 */
export const getFormattedValue = (
    value: powerbi.PrimitiveValue | undefined | null,
    format: string | undefined | null,
    options: ValueFormatterOptions = {}
) => createFormatterFromString(format, options).format(value);
