import { type TableColumn } from 'react-data-table-component';
import { type IWorkerDatasetViewerDataTableRow } from '../../workers';
import { type VegaDatum } from '@deneb-viz/powerbi-compat/interactivity';

export type DatasetRaw = {
    hashValue: string | null;
    values: VegaDatum[];
};

export type DatasetState = {
    columns: TableColumn<IWorkerDatasetViewerDataTableRow>[] | null;
    jobQueue: string[];
    processing: boolean;
    values: IWorkerDatasetViewerDataTableRow[] | null;
};
