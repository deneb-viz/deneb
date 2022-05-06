import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;

import find from 'lodash/find';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import reduce from 'lodash/reduce';

import { isCrossHighlightPropSet } from '../../features/interactivity';
import {
    IAugmentedMetadataField,
    IVisualDatasetFields,
    TDatasetValueSource
} from '.';
import { resolveVisualMetaToDatasetField } from '../template';
import { getDataset } from './dataset';
import { ITemplateDatasetField } from '../../features/template';
import { HIGHLIGHT_FIELD_SUFFIX } from '../../constants';

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
) => [
    ...getCategoryFieldEntries(categories),
    ...getHighlightFieldEntries(values),
    ...getMeasureFieldEntries(values)
];

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
            const isExcludedFromTemplate = c.source === 'highlights';
            result[`${encodedName}`] = {
                ...c.column,
                ...{
                    isColumn: !c.column.isMeasure,
                    isExcludedFromTemplate,
                    sourceIndex: c.sourceIndex,
                    source: <TDatasetValueSource>c.source,
                    templateMetadata: isExcludedFromTemplate
                        ? undefined
                        : resolveVisualMetaToDatasetField(c.column, encodedName)
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
        getDatasetFieldsInclusive(getDataset().fields),
        (f) => f?.templateMetadata?.key === queryName
    ) || null;

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export const getDatasetFieldsInclusive = (fields: IVisualDatasetFields) =>
    pickBy(fields, (f) => !f.isExcludedFromTemplate);

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
export const getDatasetTemplateFields = (
    metadata: IVisualDatasetFields
): ITemplateDatasetField[] =>
    reduce(
        getDatasetFieldsInclusive(metadata),
        (result, value, key) => result.concat(value.templateMetadata),
        <ITemplateDatasetField[]>[]
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
    displayName?.replace(/([\\".\[\]])/g, '_') || '';

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
