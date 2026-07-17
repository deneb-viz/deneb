import { type IWorkerDatasetViewerDataTableRow } from '../../workers';
import { type VegaDatum } from '@deneb-viz/data-core/value';
import { type DataTableViewerColumn } from '../data-table/data-table-viewer-types';

export type DatasetRaw = {
    hashValue: string | null;
    values: VegaDatum[];
};

export type DatasetState = {
    columns: DataTableViewerColumn<IWorkerDatasetViewerDataTableRow>[] | null;
    jobQueue: string[];
    processing: boolean;
    values: IWorkerDatasetViewerDataTableRow[] | null;
};
