import powerbi from 'powerbi-visuals-api';

import {
    type DatasetFieldValueSource,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    isFieldEligibleForFormatting,
    type AugmentedMetadataField,
    type IDatasetFields
} from '../field';
import { isCrossHighlightPropSet } from '@deneb-viz/powerbi-compat/interactivity';
import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { getResolvedVisualMetadataToDatasetField } from '@deneb-viz/json-processing';

const UNKNOWN_CATEGORY_INDEX = Infinity;

/**
 * Extract all categorical fields from the data view as suitable metadata.
 */
const getCategoryFieldEntries = (
    categories: powerbi.DataViewCategoryColumn[]
): AugmentedMetadataField[] =>
    categories?.map(
        (c, ci): AugmentedMetadataField => ({
            column: c.source,
            source: 'categories',
            sourceIndex: ci
        })
    ) || [];

/**
 * For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all fields for
 * the dataset.
 */
export const getDatumFieldMetadataFromDataView = (
    categories: powerbi.DataViewCategoryColumn[],
    values: powerbi.DataViewValueColumns,
    enableHighlight: boolean
) => {
    logTimeStart('getDatumFieldMetadataFromDataView');
    const fieldEntries = [
        ...getCategoryFieldEntries(categories),
        ...getHighlightFieldEntries(values, enableHighlight),
        ...getMeasureFieldEntries(values),
        ...getMeasureFormatEntries(values)
    ];
    logTimeEnd('getDatumFieldMetadataFromDataView');
    return fieldEntries;
};

/**
 * For all dataset fields, get a consolidated array of all entries, plus additional metadata to assist with template
 * and selection ID generation when the data view is mapped.
 */
export const getDatumFieldsFromMetadata = (
    fields: AugmentedMetadataField[]
): IDatasetFields => {
    return fields.reduce<IDatasetFields>((result, c) => {
        const encodedName = getEncodedFieldName(c.column.displayName);
        const isExcludedFromTemplate = isSourceExcludedFromTemplate(c.source);
        result[`${encodedName}`] = {
            ...c.column,
            ...{
                isColumn: !c.column.isMeasure,
                isHighlightComponent: c.source === 'highlights',
                isExcludedFromTemplate,
                sourceIndex: c.sourceIndex,
                source: <DatasetFieldValueSource>c.source,
                templateMetadata: isExcludedFromTemplate
                    ? undefined
                    : getResolvedVisualMetadataToDatasetField(
                          c.column,
                          encodedName
                      )
            }
        };
        return result;
    }, {});
};

/**
 * If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and
 * encodings, we will replace them with an underscore, which is much easier to educate people on than having to learn
 * all the specifics of escaping in the right context, in the right way.
 *
 *  - Vega: https://vega.github.io/vega/docs/types/#Field
 *  - Vega-Lite: https://vega.github.io/vega-lite/docs/field.html
 */
export const getEncodedFieldName = (displayName: string) =>
    displayName?.replace(/([\\".[\]])/g, '_') || '';

/**
 * Get artificial array of values first (if needed) as we'll need them when working out highlights later on.
 */
const getHighlightFieldEntries = (
    values: powerbi.DataViewValueColumns,
    enableHighlight: boolean
) =>
    (isCrossHighlightPropSet({ enableHighlight }) &&
        values?.map(
            (v, vi): AugmentedMetadataField => ({
                column: {
                    ...v.source,
                    ...{
                        displayName: `${v.source.displayName}${HIGHLIGHT_FIELD_SUFFIX}`,
                        index: getResolvedArtificialIndex(v?.source?.index)
                    }
                },
                source: 'highlights',
                sourceIndex: vi
            })
        )) ||
    [];

/**
 * Extract all measure fields from the data view as suitable metadata.
 */
const getMeasureFieldEntries = (values: powerbi.DataViewValueColumns) =>
    values?.map(
        (v, vi): AugmentedMetadataField => ({
            column: v.source,
            source: 'values',
            sourceIndex: vi
        })
    ) || [];

/**
 * For each measure, we also wish to obtain the format string and the formatted value, so that we can utilize these at
 * a datum level for scenarios like the new dynamic formatting values for measurers, and calculation groups with
 * contextual formatting.
 */
const getMeasureFormatEntries = (
    values: powerbi.DataViewValueColumns
): AugmentedMetadataField[] => {
    return (values || []).reduce<AugmentedMetadataField[]>((result, v, vi) => {
        if (isFieldEligibleForFormatting(v)) {
            result = result.concat([
                {
                    column: {
                        ...v.source,
                        ...{
                            displayName: `${v.source.displayName}${FORMAT_FIELD_SUFFIX}`,
                            index: getResolvedArtificialIndex(v?.source?.index)
                        }
                    },
                    source: 'formatting',
                    sourceIndex: vi
                },
                {
                    column: {
                        ...v.source,
                        ...{
                            displayName: `${v.source.displayName}${FORMATTED_FIELD_SUFFIX}`,
                            index: getResolvedArtificialIndex(v?.source?.index)
                        }
                    },
                    source: 'formatting',
                    sourceIndex: vi
                }
            ]);
        }
        return result;
    }, []);
};

const getResolvedArtificialIndex = (index: number | undefined) =>
    -(index ?? UNKNOWN_CATEGORY_INDEX);

/**
 * Allows us to test that a field is excluded from templating activities.
 */
const isSourceExcludedFromTemplate = (source: DatasetFieldValueSource) =>
    ['highlights', 'formatting'].includes(source);
