import type { SupportFieldValueProvider } from '@deneb-viz/data-core/support-fields';
import type { PrimitiveValue } from '@deneb-viz/data-core/value';
import { getValueFormatter } from '@deneb-viz/powerbi-compat/formatting';
import type powerbi from 'powerbi-visuals-api';
import type { AugmentedMetadataField } from './types';

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
     * DataView source for each source field, in baseValues / planSourceColumns
     * order — fieldSourceMappings[i] describes planSourceColumns[i], i.e. the
     * value at baseValues[i]. The provider is indexed by these baseValue slot
     * indices (a field instruction's baseValueIndex, or a parameter instruction's
     * componentIndices) — NOT by plan.fields order. The plan emits parameter
     * instructions first and drops component fields, so plan.fields positions do
     * not line up with these mappings.
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
): SupportFieldValueProvider => {
    // Cache one Power BI value formatter per (locale, format string) pair for
    // the lifetime of this provider (one getMappedDataset call). getFormattedValue
    // runs per row × measure; constructing a fresh valueFormatter on every call
    // costs O(rows × measures) heavyweight constructions per update — acute for a
    // migrated legacy spec that emits __formatted__ on every measure. A column's
    // format string is usually constant, so a keyed cache collapses that to
    // ~distinct (locale, format string) pairs. Locale is supplied per call (not
    // fixed at construction), so it is part of the key.
    const formatterCache = new Map<
        string,
        ReturnType<typeof getValueFormatter>
    >();
    const getCachedFormatter = (formatString: string, locale: string) => {
        // A space cannot occur in a BCP-47 locale tag, so the key never collides.
        const key = `${locale} ${formatString}`;
        let formatter = formatterCache.get(key);
        if (!formatter) {
            formatter = getValueFormatter(formatString, {
                cultureSelector: locale
            });
            formatterCache.set(key, formatter);
        }
        return formatter;
    };

    return {
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
            return getCachedFormatter(formatString, locale).format(
                value as powerbi.PrimitiveValue
            ) as PrimitiveValue;
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
    };
};

/**
 * Pre-resolve a parameter group's format strings from static column metadata
 * — but only when EVERY component has one. A measure with a dynamic format
 * string carries no static `column.format` (and when any dynamic-format
 * calculation item exists in the model, Power BI strips static formats from
 * ALL measure columns, delivering them per-row via
 * `objects[rowIndex].general.formatString` instead). Returning undefined
 * makes `buildDataRow` fall back to per-row provider resolution, which
 * handles both channels. When every component does have a static format the
 * pre-resolved array is equivalent (the provider checks `source.format`
 * first) and skips the per-row lookup.
 */
export const getStaticParameterFormatStrings = (
    componentFormats: (string | undefined)[]
): string[] | undefined =>
    componentFormats.every((format) => typeof format === 'string')
        ? (componentFormats as string[])
        : undefined;

/**
 * Build the per-field DataView source mappings the provider indexes by, one per
 * source column (categories/values) in planSourceColumns order.
 *
 * Each column is classified by its authoritative DataView provenance
 * (`c.source`), which is what the planSourceColumns filter itself uses — NOT by
 * `column.isMeasure`. A values-bucket column can carry a falsy/undefined
 * `isMeasure` (field-parameter / group-on-keys shapes); classifying such a
 * column as 'categories' would make `mapping.index` (its dvValues index) point
 * into the dvCategories array instead, silently yielding the wrong format
 * strings and highlights.
 *
 * The parameter type constrains `source` to the two source provenances so the
 * pre-filtering invariant (callers pass only `isSourceField` columns) is
 * compiler-enforced — an unfiltered 'highlights'/'formatting'/'none' column
 * would otherwise be silently mapped to 'categories' and index the wrong
 * DataView array.
 */
export const buildFieldSourceMappings = (
    planSourceColumns: Array<
        AugmentedMetadataField & { source: 'categories' | 'values' }
    >
): FieldSourceMapping[] =>
    planSourceColumns.map((c) => ({
        source: c.source,
        index: c.sourceIndex
    }));
