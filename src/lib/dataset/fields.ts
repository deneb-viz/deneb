import powerbi from 'powerbi-visuals-api';

import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    DatasetFields,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    type UsermetaDatasetField,
    type UsermetaDatasetFieldType
} from '@deneb-viz/data-core/field';
import type { AugmentedMetadataField, DatasetFieldValueSource } from './types';
import { isCrossHighlightPropSet } from '../interactivity';

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
            sourceIndex: ci,
            encodedName: getEncodedFieldName(c.source.displayName)
        })
    ) || [];

/**
 * For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all fields for
 * the dataset.
 */
export const getDatumFieldMetadataFromDataView = (
    categories: powerbi.DataViewCategoryColumn[],
    values: powerbi.DataViewValueColumns
) => {
    logTimeStart('getDatumFieldMetadataFromDataView');
    const fieldEntries = [
        ...getCategoryFieldEntries(categories),
        ...getHighlightFieldEntries(values),
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
): DatasetFields<AugmentedMetadataField> => {
    return fields.reduce<DatasetFields<AugmentedMetadataField>>((result, c) => {
        const encodedName =
            c.encodedName ?? getEncodedFieldName(c.column.displayName);
        const isExcludedFromTemplate = isSourceExcludedFromTemplate(c.source);
        result[`${encodedName}`] = {
            ...{
                id: c.column.queryName ?? c.column.displayName ?? '',
                name: encodedName,
                isExcludedFromTemplate,
                hostMetadata: c,
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
const getHighlightFieldEntries = (values: powerbi.DataViewValueColumns) =>
    (isCrossHighlightPropSet() &&
        values?.map((v, vi): AugmentedMetadataField => {
            const displayName = `${v.source.displayName}${HIGHLIGHT_FIELD_SUFFIX}`;
            return {
                column: {
                    ...v.source,
                    ...{
                        displayName,
                        index: getResolvedArtificialIndex(v?.source?.index)
                    }
                },
                source: 'highlights',
                sourceIndex: vi,
                encodedName: getEncodedFieldName(displayName)
            };
        })) ||
    [];

/**
 * Extract all measure fields from the data view as suitable metadata.
 */
const getMeasureFieldEntries = (values: powerbi.DataViewValueColumns) =>
    values?.map(
        (v, vi): AugmentedMetadataField => ({
            column: v.source,
            source: 'values',
            sourceIndex: vi,
            encodedName: getEncodedFieldName(v.source.displayName)
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
    return (
        values?.reduce<AugmentedMetadataField[]>((result, v, vi) => {
            if (isFieldEligibleForFormatting(v)) {
                const formatDisplayName = `${v.source.displayName}${FORMAT_FIELD_SUFFIX}`;
                const formattedDisplayName = `${v.source.displayName}${FORMATTED_FIELD_SUFFIX}`;
                result = result.concat([
                    {
                        column: {
                            ...v.source,
                            ...{
                                displayName: formatDisplayName,
                                index: getResolvedArtificialIndex(
                                    v?.source?.index
                                )
                            }
                        },
                        source: 'formatting',
                        sourceIndex: vi,
                        encodedName: getEncodedFieldName(formatDisplayName)
                    },
                    {
                        column: {
                            ...v.source,
                            ...{
                                displayName: formattedDisplayName,
                                index: getResolvedArtificialIndex(
                                    v?.source?.index
                                )
                            }
                        },
                        source: 'formatting',
                        sourceIndex: vi,
                        encodedName: getEncodedFieldName(formattedDisplayName)
                    }
                ]);
            }
            return result;
        }, []) || []
    );
};

const getResolvedArtificialIndex = (index: number | undefined) =>
    -(index ?? UNKNOWN_CATEGORY_INDEX);

/**
 * For a given column or measure (or template placeholder), resolve its type
 * against the corresponding Power BI value descriptor.
 */
export const getResolvedValueDescriptor = (
    type: powerbi.ValueTypeDescriptor
): UsermetaDatasetFieldType => {
    switch (true) {
        case type?.bool:
            return 'bool';
        case type?.text:
            return 'text';
        case type?.numeric:
            return 'numeric';
        case type?.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};

/**
 * For a given `DataViewMetadataColumn`, and its encoded name produces a new
 * `ITemplateDatasetField` object that can be used for templating purposes.
 */
export const getResolvedVisualMetadataToDatasetField = (
    metadata: powerbi.DataViewMetadataColumn,
    encodedName: string
): UsermetaDatasetField => {
    return {
        key: metadata.queryName ?? metadata.displayName ?? '',
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: getResolvedValueDescriptor(
            metadata.type as powerbi.ValueTypeDescriptor
        )
    };
};

/**
 * Test if a data view field is numeric or date/time valued. if so, then we
 * should provide formatting support fields for it.
 */
export const isFieldEligibleForFormatting = (
    field: powerbi.DataViewValueColumn
) => field?.source?.type?.numeric || field?.source?.type?.dateTime || false;

/**
 * Allows us to test that a field is excluded from templating activities.
 */
const isSourceExcludedFromTemplate = (source: DatasetFieldValueSource) =>
    ['highlights', 'formatting'].includes(source);
