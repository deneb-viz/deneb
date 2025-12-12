import {
    getUrlFromBlob,
    getWorkerAsBlobFromRawFile,
    getWorkerFromUrl
} from '@deneb-viz/utils/worker';
import dataTableWorkerScript from '../../../../dist/worker/data-viewer.worker.js';
import type { IWorkerDatasetViewer } from './types';

/**
 * Used for the calculation of display widths and formatted values for the dataset viewer in the debug table.
 */
export const datasetViewerWorker: IWorkerDatasetViewer = getWorkerFromUrl(
    getUrlFromBlob(getWorkerAsBlobFromRawFile(dataTableWorkerScript as string))
);
export type * from './types';
