import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;

import find from 'lodash/find';
import reduce from 'lodash/reduce';

import { isCrossHighlightPropSet } from '../../features/interactivity';
import {
    IAugmentedMetadataField,
    IVisualDatasetFields,
    TDatasetValueSource
} from '.';
import { getDataset } from './dataset';
import { HIGHLIGHT_FIELD_SUFFIX } from '../../constants';
import { isDataViewFieldEligibleForFormatting } from '../../features/dataset';
import { logTimeEnd, logTimeStart } from '../../features/logging';
import {
    DATASET_FIELD_FORMAT_STRING_SUFFIX,
    DATASET_FIELD_FORMATED_VALUE_SUFFIX,
    UsermetaDatasetField,
    dataset
} from '@deneb-viz/core-dependencies';
import { getResolvedVisualMetadataToDatasetField } from '@deneb-viz/json-processing';

/**
 * Extract all categorical fields from the data view as suitable metadata.
 */
const getCategoryFieldEntries = (
    categories: DataViewCategoryColumn[]
): IAugmentedMetadataField[] =>
    categories?.map(
        (c, ci): IAugmentedMetadataField => ({
            column: c.source,
            source: 'categories',
            sourceIndex: ci
        })
    ) || [];

/**
 * For supplied data view metadata (columns & measures), enumerate them and
 * produce a unified list of all fields for the dataset.
 */
export const getDatasetFieldEntries = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => {
    logTimeStart('getDatasetFieldEntries');
    const fieldEntries = [
        ...getCategoryFieldEntries(categories),
        ...getHighlightFieldEntries(values),
        ...getMeasureFieldEntries(values),
        ...getMeasureFormatEntries(values)
    ];
    logTimeEnd('getDatasetFieldEntries');
    return fieldEntries;
};

/**
 * For all dataset fields, get a consolidated array of all entries, plus
 * additional metadata to assist with template and selection ID generation
 * when the data view is mapped.
 */
export const getDatasetFields = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
): IVisualDatasetFields => {
    const fields = getDatasetFieldEntries(categories, values);
    return reduce(
        fields,
        (result, c) => {
            const encodedName = getEncodedFieldName(c.column.displayName);
            const isExcludedFromTemplate = isSourceExcludedFromTemplate(
                c.source
            );
            result[`${encodedName}`] = {
                ...c.column,
                ...{
                    isColumn: !c.column.isMeasure,
                    isHighlightComponent: c.source === 'highlights',
                    isExcludedFromTemplate,
                    sourceIndex: c.sourceIndex,
                    source: <TDatasetValueSource>c.source,
                    templateMetadata: isExcludedFromTemplate
                        ? undefined
                        : getResolvedVisualMetadataToDatasetField(
                              c.column,
                              encodedName
                          )
                }
            };
            return result;
        },
        <IVisualDatasetFields>{}
    );
};

/**
 * Do a simple lookup against the store dataset for a given template key
 */
export const getDatasetFieldByTemplateKey = (queryName: string) =>
    find(
        dataset.getDatasetFieldsInclusive(getDataset().fields),
        (f) => f?.templateMetadata?.key === queryName
    ) || null;

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
export const getDatasetTemplateFields = (
    metadata: IVisualDatasetFields
): UsermetaDatasetField[] =>
    reduce(
        dataset.getDatasetFieldsInclusive(metadata),
        (result, value) => result.concat(value.templateMetadata),
        <UsermetaDatasetField[]>[]
    );

/**
 * If a Power BI column or measure contains characters that create problems in
 * JSON or Vega/Vega-Lite expressions and encodings, we will replace them with
 * an underscore, which is much easier to educate people on than having to
 * learn all the specifics of escaping in the right context, in the right way.
 *
 *  - Vega: https://vega.github.io/vega/docs/types/#Field
 *  - Vega-Lite: https://vega.github.io/vega-lite/docs/field.html
 */
export const getEncodedFieldName = (displayName: string) =>
    displayName?.replace(/([\\".[\]])/g, '_') || '';

/**
 * Get artificial array of values first (if needed) as we'll need them when
 * working out highlights later on.
 */
const getHighlightFieldEntries = (values: DataViewValueColumns) =>
    (isCrossHighlightPropSet() &&
        values?.map(
            (v, vi): IAugmentedMetadataField => ({
                column: {
                    ...v.source,
                    ...{
                        displayName: `${v.source.displayName}${HIGHLIGHT_FIELD_SUFFIX}`,
                        index: -v.source.index
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
const getMeasureFieldEntries = (values: DataViewValueColumns) =>
    values?.map(
        (v, vi): IAugmentedMetadataField => ({
            column: v.source,
            source: 'values',
            sourceIndex: vi
        })
    ) || [];

/**
 * For each measure, we also wish to obtain the format string and the formatted
 * value, so that we can utilise these at a datum level for sceanrios like the
 * new dynamic formatting values for measurers, and calculation groups with
 * contextual formatting.
 */
const getMeasureFormatEntries = (
    values: DataViewValueColumns
): IAugmentedMetadataField[] => {
    return reduce(
        values,
        (result, v, vi) => {
            if (isDataViewFieldEligibleForFormatting(v)) {
                result = result.concat([
                    {
                        column: {
                            ...v.source,
                            ...{
                                displayName: `${v.source.displayName}${DATASET_FIELD_FORMAT_STRING_SUFFIX}`,
                                index: -v.source.index
                            }
                        },
                        source: 'formatting',
                        sourceIndex: vi
                    },
                    {
                        column: {
                            ...v.source,
                            ...{
                                displayName: `${v.source.displayName}${DATASET_FIELD_FORMATED_VALUE_SUFFIX}`,
                                index: -v.source.index
                            }
                        },
                        source: 'formatting',
                        sourceIndex: vi
                    }
                ]);
            }
            return result;
        },
        <IAugmentedMetadataField[]>[]
    );
};

/**
 * Allows us to test that a field is excluded from templating activities.
 */
const isSourceExcludedFromTemplate = (source: TDatasetValueSource) =>
    ['highlights', 'formatting'].includes(source);
