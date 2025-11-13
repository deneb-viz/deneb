import powerbi from 'powerbi-visuals-api';
import { type IDataset } from '@deneb-viz/dataset/data';

/**
 * Stages to within the store when processing data, and therefore give us some UI hooks for the end-user.
 */
export type DataProcessingStage =
    | 'Initial'
    | 'Fetching'
    | 'Processing'
    | 'Processed';

export type DatasetProcessingPayload = {
    dataProcessingStage: DataProcessingStage;
    rowsLoaded: number;
};

export type DatasetSlice = {
    dataset: IDataset;
    datasetCategories: powerbi.DataViewCategoryColumn[];
    datasetHasHighlights: boolean;
    datasetHasSelectionAborted: boolean;
    datasetProcessingStage: DataProcessingStage;
    datasetSelectionLimit: number;
    datasetViewObjects: powerbi.DataViewObjects;
    updateDataset: (payload: VisualDatasetUpdatePayload) => void;
    updateDatasetProcessingStage: (payload: DatasetProcessingPayload) => void;
    updateDatasetSelectors: (selectors: powerbi.visuals.ISelectionId[]) => void;
    updateDatasetSelectionAbortStatus: (
        payload: VisualDatasetAbortPayload
    ) => void;
};

export type VisualDatasetUpdatePayload = {
    categories: powerbi.DataViewCategoryColumn[];
    dataset: IDataset;
};

export type VisualDatasetAbortPayload = {
    status: boolean;
    limit: number;
};
