export { createFormatterFromString };

import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import { hostServices } from '../../core/services';

const createFormatterFromString = (format: string) =>
    valueFormatter.create({
        format,
        cultureSelector: hostServices.locale
    });
