import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import _ from 'lodash';

import { IVisualValueMetadata, IVisualValueRow } from '../dataset/public';
import { resolveVisualMetaToDatasetField } from '../template/public_noconflict';
import { IAugmentedMetadataField } from './public';

export const castPrimitiveValue = (
    field: IAugmentedMetadataField,
    value: powerbi.PrimitiveValue
) => (field?.column.type.dateTime ? new Date(value.toString()) : value);

export const encodeFieldForSpec = (displayName: string) =>
    displayName?.replace(/([\\".\[\]])/g, '_') || '';

export const getConsolidatedFields = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => [
    ...(categories?.map((c, ci) => ({
        column: c.source,
        source: 'categories',
        sourceIndex: ci
    })) || []),
    ...(values?.map((v, vi) => ({
        column: v.source,
        source: 'values',
        sourceIndex: vi
    })) || [])
];

export const getConsolidatedMetadata = (fields: IAugmentedMetadataField[]) => {
    return _(fields).reduce((result, c) => {
        const encodedName = encodeFieldForSpec(c.column.displayName);
        result[encodedName] = {
            ...c.column,
            ...{
                isColumn: !c.column.isMeasure,
                sourceIndex: c.sourceIndex,
                templateMetadata: resolveVisualMetaToDatasetField(
                    c.column,
                    encodedName
                )
            }
        };
        return result;
    }, <IVisualValueMetadata>{});
};

export const getConsolidatedValues = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => [
    ...(categories?.map((c) => c.values) || []),
    ...(values?.map((v) => v.values) || [])
];

export const getDataRoleIndex = (
    fields: DataViewMetadataColumn[],
    role: string
) => fields?.findIndex((f) => f.roles[`${role}`]) || -1;

export const getDataRow = (
    fields: IAugmentedMetadataField[],
    values: powerbi.PrimitiveValue[][],
    index: number
) =>
    _(fields).reduce((accumulator, f, fi) => {
        const rawValue = values[fi][index];
        if (f?.column.roles?.dataset) {
            accumulator[
                encodeFieldForSpec(f.column.displayName)
            ] = castPrimitiveValue(f, rawValue);
        }
        return accumulator;
    }, <IVisualValueRow>{});
