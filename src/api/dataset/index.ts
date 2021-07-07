export {
    getDataset,
    getEmptyDataset,
    getMetadata,
    getMetadataByKeys,
    getValues,
    getValueForDatum,
    IVisualDataset,
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
};

import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import ISelectionId = powerbi.visuals.ISelectionId;
import _ from 'lodash';

import { ITemplateDatasetField } from '../../schema/template-v1';

import { getState } from '../store';
import { resolveDatumForMetadata, IVegaViewDatum } from '../selection';

const getDataset = () => getState().visual?.dataset;

const getEmptyDataset = (): IVisualDataset => ({
    metadata: {},
    values: []
});

const getMetadata = () => getDataset().metadata;

const getMetadataByKeys = (keys: string[] = []) => _.pick(getMetadata(), keys);

const getValues = () => getDataset().values;

const getValueForDatum = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
): IVisualValueRow =>
    _(getValues()).find(_.matches(resolveDatumForMetadata(metadata, datum))) ||
    null;

interface IVisualDataset {
    // All column information that we need to know about (including generated raw values)
    metadata: IVisualValueMetadata;
    // Raw data values for each column
    values: IVisualValueRow[];
}

interface IVisualValueMetadata {
    // Column name & metadata
    [key: string]: ITableColumnMetadata;
}

interface ITableColumnMetadata extends DataViewMetadataColumn {
    // Flag to confirm if this is a column, according to the data model
    isColumn: boolean;
    // Original dataView index (from categories or values)
    sourceIndex: number;
    // Template export object (which allows customisation from base, while preserving)
    templateMetadata: ITemplateDatasetField;
}

interface IVisualValueRow {
    // Allow key/value pairs for any objects added to the content data role
    [key: string]: any;
    // Identity index (from dataView; for dynamic selectors)
    identityIndex: number;
    // Selection ID for row
    __identity__: ISelectionId;
    // String representation of Selection ID
    __key__: string;
}
