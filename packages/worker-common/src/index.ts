import {
    IWorkerDatasetViewer,
    IWorkerSpecFieldsInUse
} from '@deneb-viz/core-dependencies';
import dataTable from '@deneb-viz/worker-dataset-viewer';
import fieldsInUse from '@deneb-viz/worker-spec-fields-in-use';

/**
 * Create a new worker from a raw file string.
 */
const getNewWorkerFromRawFile = (rawFile: string) => {
    const workerBlob = new Blob([rawFile], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(workerBlob);
    return new Worker(workerURL);
};

/**
 * Used for the calculation of display widths and formatted values for the dataset viewer in the debug table.
 */
export const datasetViewerWorker: IWorkerDatasetViewer =
    getNewWorkerFromRawFile(dataTable as string);

/**
 * Used for the tracking of fields in use from a dataset specification.
 */
export const fieldsInUseWorker: IWorkerSpecFieldsInUse =
    getNewWorkerFromRawFile(fieldsInUse as string);
