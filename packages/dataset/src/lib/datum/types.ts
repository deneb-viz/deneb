import powerbi from 'powerbi-visuals-api';

import {
    ROW_IDENTITY_FIELD_NAME,
    ROW_INDEX_FIELD_NAME,
    ROW_KEY_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '../field';
import { type DataPointSelectionStatus } from '@deneb-viz/powerbi-compat/interactivity';

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
     * Selection ID for row
     */
    [ROW_IDENTITY_FIELD_NAME]: powerbi.visuals.ISelectionId;
    /**
     * String representation of Selection ID.
     */
    [ROW_KEY_FIELD_NAME]: string;
    /**
     * Flexible fields from data view (keys as as per `IDatasetFields`).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};
