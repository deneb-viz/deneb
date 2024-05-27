import dataTable from '@deneb-viz/worker-dataset-viewer';

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
export const datasetViewerWorker = getNewWorkerFromRawFile(dataTable as string);
