import powerbi from 'powerbi-visuals-api';
import PrimitiveValue = powerbi.PrimitiveValue;
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import { hostServices } from '../core/services';

/**
 * Convenience function that creates a Power BI `valueFormatter.IValueFormatter` using the supplied format string, and using the visual's locale.
 */
export const createFormatterFromString = (format: string) =>
    valueFormatter.create({
        format,
        cultureSelector: hostServices.locale
    });

/**
 * For the supplied value and Power BI format string, attempt to format it.
 */
export const powerBiFormatValue = (value: PrimitiveValue, format: string) =>
    createFormatterFromString(format).format(value);
