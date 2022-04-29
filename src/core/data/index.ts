import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import ISelectionId = powerbi.visuals.ISelectionId;

import { ITemplateDatasetField } from '../template/schema';
import { TDataPointSelectionStatus } from '../../features/interactivity';

export * as dataset from './dataset';
export * as dataView from './dataView';

/**
 * Used to store interim data whilst the data view is being processed
 */
export interface IAugmentedMetadataField {
    // Power bI data view metadata.
    column: powerbi.DataViewMetadataColumn;
    // Where we have derived the metadata from.
    source: TDatasetValueSource;
    // Array index we can use to re-point to the data view (if needed).
    sourceIndex: number;
}

/**
 * Represents the processed dataset, available to the visual store.
 */
export interface IVisualDataset {
    // Field metadata
    fields: IVisualDatasetFields;
    // Processed values, pointing to field metadata, as well as any dedicated
    // row-related fields.
    values: IVisualDatasetValueRow[];
    hasHighlights: boolean;
}

/**
 * Field metadata that we wish to expose to the dataset; flexible keys.
 */
export interface IVisualDatasetFields {
    [key: string]: IVisualDatasetField;
}

/**
 * Metadata for dataset fields. This is based on the Power BI metadata and is
 * enriched with other properties that we need for Deneb.
 */
export interface IVisualDatasetField extends DataViewMetadataColumn {
    // Flag to confirm if this is a column, according to the data model. This
    // is not in the Power BI metadata but is helpful for us to know later on.
    isColumn: boolean;
    // Indicates field should not be included in templating activities and
    // supports another field in the dataset.
    isExcludedFromTemplate: boolean;
    // Original dataView index (from categories or values), if we need it for
    // other operations post assembly.
    sourceIndex: number;
    // Template export object (which allows customisation from base, while
    // preserving) should not be present for `isExcludedFromTemplate: true`.
    templateMetadata?: ITemplateDatasetField;
}

export interface IVisualDatasetValueRow {
    // Identity index (from dataView; for dynamic selectors).
    __row__: number;
    // Selection status (for selection manager).
    __selected__?: TDataPointSelectionStatus;
    // Selection ID for row
    __identity__: ISelectionId;
    // String representation of Selection ID.
    __key__: string;
    // Flexible fields from data view (keys as as per IVisualDatasetFields).
    [key: string]: any;
}

/**
 * Stages to within the store when processing data, and therefore give us some
 * UI hooks for the end-user.
 */
export type TDataProcessingStage =
    | 'Initial'
    | 'Fetching'
    | 'Processing'
    | 'Processed';

/**
 * Indicates where in the data view we obtain a value from.
 */
export type TDatasetValueSource =
    | 'categories'
    | 'values'
    | 'highlights'
    | 'none';
