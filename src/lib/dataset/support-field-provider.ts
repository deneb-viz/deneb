import type { SupportFieldValueProvider } from '@deneb-viz/data-core/support-fields';
import type { PrimitiveValue } from '@deneb-viz/data-core';
import { getFormattedValue as pbiGetFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import type powerbi from 'powerbi-visuals-api';

export type CreatePbiProviderParams = {
    categories: powerbi.DataViewCategoryColumn[] | undefined;
    values: powerbi.DataViewValueColumns | undefined;
    hasHighlights: boolean;
    locale: string;
};

/**
 * Create a Power BI-specific support field value provider.
 *
 * Captures references to the DataView structures at construction time (once
 * per getMappedDataset call) and resolves format strings, formatted values,
 * and highlight values from Power BI's DataView structures.
 */
export const createPbiSupportFieldProvider = (
    params: CreatePbiProviderParams
): SupportFieldValueProvider => ({
    getFormatString: (fieldIndex: number, rowIndex: number): string => {
        const valueColumn = params.values?.[fieldIndex];
        if (!valueColumn) {
            return '';
        }
        return (
            valueColumn.source?.format ??
            (valueColumn.objects?.[rowIndex]?.general?.formatString as
                | string
                | undefined) ??
            ''
        );
    },

    getFormattedValue: (
        value: PrimitiveValue,
        formatString: string,
        locale: string
    ): PrimitiveValue => {
        return pbiGetFormattedValue(value, formatString, {
            cultureSelector: locale
        }) as PrimitiveValue;
    },

    getHighlightValue: (
        fieldIndex: number,
        rowIndex: number,
        baseValue: PrimitiveValue
    ): PrimitiveValue => {
        if (!params.hasHighlights) {
            return baseValue;
        }
        const highlights = params.values?.[fieldIndex]?.highlights;
        if (!highlights) {
            return baseValue;
        }
        return highlights[rowIndex] as PrimitiveValue;
    }
});
