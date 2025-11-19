import powerbi from 'powerbi-visuals-api';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

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
