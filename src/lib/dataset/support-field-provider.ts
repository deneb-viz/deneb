import type { SupportFieldValueProvider } from '@deneb-viz/data-core/support-fields';
import type { PrimitiveValue } from '@deneb-viz/data-core/value';
import { getFormattedValue as pbiGetFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import type powerbi from 'powerbi-visuals-api';

/**
 * Describes the DataView source for a single field in the processing plan.
 * Built once per getMappedDataset call from the source columns metadata.
 */
export type FieldSourceMapping = {
    /** 'categories' for grouping fields, 'values' for aggregation fields. */
    source: 'categories' | 'values';
    /** Index into the corresponding DataView array (dvCategories or dvValues). */
    index: number;
};

export type CreatePbiProviderParams = {
    categories: powerbi.DataViewCategoryColumn[] | undefined;
    values: powerbi.DataViewValueColumns | undefined;
    hasHighlights: boolean;
    /**
     * Maps each plan field position to its DataView source.
     * Order must match plan.fields — fieldSourceMappings[i] corresponds to
     * the field at plan.fields[i].
     */
    fieldSourceMappings: FieldSourceMapping[];
};

/**
 * Create a Power BI-specific support field value provider.
 *
 * Captures references to the DataView structures at construction time (once
 * per getMappedDataset call) and resolves format strings, formatted values,
 * and highlight values from Power BI's DataView structures.
 *
 * The fieldSourceMappings array maps each plan field index to the correct
 * DataView source (categories or values), resolving the index mismatch
 * between grouping fields (indexed into dvCategories) and aggregation
 * fields (indexed into dvValues).
 */
export const createPbiSupportFieldProvider = (
    params: CreatePbiProviderParams
): SupportFieldValueProvider => ({
    getFormatString: (fieldIndex: number, rowIndex: number): string => {
        const mapping = params.fieldSourceMappings[fieldIndex];
        if (!mapping) return '';

        if (mapping.source === 'categories') {
            return params.categories?.[mapping.index]?.source?.format ?? '';
        }

        const valueColumn = params.values?.[mapping.index];
        if (!valueColumn) return '';
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
        if (!params.hasHighlights) return baseValue;
        const mapping = params.fieldSourceMappings[fieldIndex];
        if (!mapping || mapping.source !== 'values') return baseValue;
        const highlights = params.values?.[mapping.index]?.highlights;
        if (!highlights) return baseValue;
        return highlights[rowIndex] as PrimitiveValue;
    }
});
