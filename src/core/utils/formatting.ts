export { createFormatterFromString };

import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import { hostServices } from '../services';

/**
 * Convenience function that creates a Power BI `valueFormatter.IValueFormatter` using the supplied format string, and using the visual's locale.
 */
const createFormatterFromString = (format: string) =>
    valueFormatter.create({
        format,
        cultureSelector: hostServices.locale
    });
