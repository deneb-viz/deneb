import { type IDatasetValueRow } from '../datum';
import { type IDatasetFields } from '../field';

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
