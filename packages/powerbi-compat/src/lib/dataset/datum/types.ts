import { type DataPointSelectionStatus } from '../../interactivity';
import { ROW_INDEX_FIELD_NAME, SELECTED_ROW_FIELD_NAME } from '../field';

/**
 * Represents a row of fields in the dataset, including any that are provided to support additional functionality.
 */
export type DatasetValueRow = {
    /**
     * Identity index (from dataView; for dynamic selectors).
     */
    [ROW_INDEX_FIELD_NAME]: number;
    /**
     * Selection status (for selection manager).
     */
    [SELECTED_ROW_FIELD_NAME]?: DataPointSelectionStatus;
    /**
     * Flexible fields from data view (keys as as per `IDatasetFields`).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};
