import powerbi from 'powerbi-visuals-api';

import {
    DATASET_CROSS_FILTER_NAME,
    DATASET_IDENTITY_NAME,
    DATASET_KEY_NAME,
    DATASET_ROW_NAME,
    UsermetaDatasetField
} from '..';

/**
 * Indicates the internal selection state of a data point.
 */
export type DataPointCrossFilterStatus = 'off' | 'neutral' | 'on';

/**
 * Represents the processed dataset, available to the visual store.
 */
export interface IDataset {
    /**
     * Field metadata.
     */
    fields: IDatasetFields;
    /**
     * The SHA hash value of the dataset; used to determine if re-processing is required.
     */
    hashValue: string;
    /**
     * Identifies whether the dataset has fields in the drilldown role.
     */
    hasDrilldown: boolean;
    /**
     * Identifies whether highlights are present in the data view.
     */
    hasHighlights: boolean;
    /**
     * Total number of rows loaded to the dataset.
     */
    rowsLoaded: number;
    /**
     * Processed values, pointing to field metadata, as well as any dedicated row-related fields.
     */
    values: IDatasetValueRow[];
}

/**
 * Metadata for dataset fields. This is based on the Power BI metadata and is enriched with other properties that we
 * need for Deneb.
 */
export interface IDatasetField extends powerbi.DataViewMetadataColumn {
    /**
     * Flag to confirm if this is a column, according to the data model. This is not in the Power BI metadata but is
     * helpful for us to know later on.
     */
    isColumn: boolean;
    /**
     * Indicates field should not be included in templating activities and supports another field in the dataset.
     */
    isExcludedFromTemplate: boolean;
    /**
     * Indicates the field is to support highlight-functionality.
     */
    isHighlightComponent: boolean;
    /**
     * Original dataView index (from categories or values), if we need it for other operations post assembly.
     */
    sourceIndex: number;
    /**
     * Representation of the field for templating purposes. Should not be present for
     * `isExcludedFromTemplate === true`.
     */
    templateMetadata?: UsermetaDatasetField;
}

/**
 * Field metadata that we wish to expose to the dataset; flexible keys.
 */
export interface IDatasetFields {
    [key: string]: IDatasetField;
}

/**
 * Represents a row of fields in the dataset, including any that are provided to support additional functionality.
 */
export interface IDatasetValueRow {
    /**
     * Identity index (from dataView; for dynamic selectors).
     */
    [DATASET_ROW_NAME]: number;
    /**
     * Selection status (for selection manager).
     */
    [DATASET_CROSS_FILTER_NAME]?: DataPointCrossFilterStatus;
    /**
     * Selection ID for row
     */
    [DATASET_IDENTITY_NAME]: powerbi.visuals.ISelectionId;
    /**
     * String representation of Selection ID.
     */
    [DATASET_KEY_NAME]: string;
    /**
     * Flexible fields from data view (keys as as per `IDatasetFields`).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}
