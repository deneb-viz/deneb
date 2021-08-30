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

import pick from 'lodash/pick';
import matches from 'lodash/matches';

import { ITemplateDatasetField } from '../template/schema';

import { getState } from '../../store';
import { resolveDatumForMetadata } from '../interactivity/selection';
import { IVegaViewDatum } from '../vega';

/**
 * Get current processed dataset (metadata and values) from Deneb's Redux store.
 */
const getDataset = () => getState().visual?.dataset;

/**
 * Ensures an empty dataset is made available.
 */
const getEmptyDataset = (): IVisualDataset => ({
    metadata: {},
    values: []
});

/**
 * Get all metadata for current processed dataset from Deneb's Redux store.
 */
const getMetadata = () => getDataset().metadata;

/**
 * Get a reduced set of metadata based on an array of key names from Deneb's Redux store.
 */
const getMetadataByKeys = (keys: string[] = []) => pick(getMetadata(), keys);

/**
 * Get all values (excluding metadata) for current processed dataset from Deneb's Redux store.
 */
const getValues = () => getDataset().values;

/**
 * For the supplied (subset of) `metadata` and `datum`, attempt to find the first matching row in the visual's processed dataset for this combination.
 */
const getValueForDatum = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
): IVisualValueRow =>
    getValues().find(matches(resolveDatumForMetadata(metadata, datum))) || null;

/**
 * Processed visual data and column metadata for rendering.
 */
interface IVisualDataset {
    // All column information that we need to know about (including generated raw values)
    metadata: IVisualValueMetadata;
    // Raw data values for each column
    values: IVisualValueRow[];
}

/**
 * The structure of our visual dataset column metadata.
 */
interface IVisualValueMetadata {
    // Column name & metadata
    [key: string]: ITableColumnMetadata;
}

/**
 * Custom data role metadata, needed to manage functionality within the editors.
 */
interface ITableColumnMetadata extends DataViewMetadataColumn {
    // Flag to confirm if this is a column, according to the data model
    isColumn: boolean;
    // Original dataView index (from categories or values)
    sourceIndex: number;
    // Template export object (which allows customisation from base, while preserving)
    templateMetadata: ITemplateDatasetField;
}

/**
 * Represents each values entry from the data view.
 */
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
