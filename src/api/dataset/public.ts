import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import ISelectionId = powerbi.visuals.ISelectionId;
import _ from 'lodash';

import { ITemplateDatasetField } from '../../schema/template-v1';

import { getState } from '../store/public';
import { resolveDatumForMetadata, IVegaViewDatum } from '../selection/public';

export const getDataset = () => getState().visual?.dataset;

export const getEmptyDataset = (): IVisualDataset => ({
    metadata: {},
    values: []
});

export const getMetadata = () => getDataset().metadata;

export const getMetadataByKeys = (keys: string[] = []) =>
    _.pick(getMetadata(), keys);

export const getValues = () => getDataset().values;

export const getValueForDatum = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
): IVisualValueRow =>
    _(getValues()).find(_.matches(resolveDatumForMetadata(metadata, datum))) ||
    null;

export interface IVisualDataset {
    // All column information that we need to know about (including generated raw values)
    metadata: IVisualValueMetadata;
    // Raw data values for each column
    values: IVisualValueRow[];
}

export interface IVisualValueMetadata {
    // Column name & metadata
    [key: string]: ITableColumnMetadata;
}

export interface ITableColumnMetadata extends DataViewMetadataColumn {
    // Flag to confirm if this is a column, according to the data model
    isColumn: boolean;
    // Original dataView index (from categories or values)
    sourceIndex: number;
    // Template export object (which allows customisation from base, while preserving)
    templateMetadata: ITemplateDatasetField;
}

export interface IVisualValueRow {
    // Allow key/value pairs for any objects added to the content data role
    [key: string]: any;
    // Identity index (from dataView; for dynamic selectors)
    identityIndex: number;
    // Selection ID for row
    __identity__: ISelectionId;
    // String representation of Selection ID
    __key__: string;
}
