export { createFormatterFromString };

import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import { getLocale } from '../i18n';

const createFormatterFromString = (format: string) =>
    valueFormatter.create({
        format,
        cultureSelector: getLocale()
    });
