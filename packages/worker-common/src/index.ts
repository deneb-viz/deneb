import {
    IWorkerDatasetViewer,
    IDenebSpecJsonWorker,
    IDenebJsonProcessingWorkerRequest,
    IDenebJsonProcessingWorkerResponse
} from '@deneb-viz/core-dependencies';
import {
    getUrlFromBlob,
    getWorkerAsBlobFromRawFile,
    getWorkerFromUrl
} from '@deneb-viz/utils/worker';
import dataTable from '@deneb-viz/worker-dataset-viewer';
import denebSpecJson from '@deneb-viz/worker-spec-json-processing';
import jsonWorker from '@deneb-viz/monaco-custom/json.worker';

/**
 * Used for the calculation of display widths and formatted values for the dataset viewer in the debug table.
 */
export const datasetViewerWorker: IWorkerDatasetViewer = getWorkerFromUrl(
    getUrlFromBlob(getWorkerAsBlobFromRawFile(dataTable as string))
);

/**
 * Used for asynchronous processing of JSON specifications.
 */
export const denebSpecJsonWorker: IDenebSpecJsonWorker = getWorkerFromUrl(
    getUrlFromBlob(getWorkerAsBlobFromRawFile(denebSpecJson as string))
);

/**
 * URL for the Monaco JSON worker. This will be used by Monaco to manually create the worker.
 */
export const monacoJsonWorkerUrl = getUrlFromBlob(
    getWorkerAsBlobFromRawFile(jsonWorker as string)
);

/**
 * Monaco worker for JSON processing.
 */
export const monacoJsonWorker: Worker = new Worker(monacoJsonWorkerUrl, {
    name: 'json'
});

/**
 * Asynchronously perform JSON manipulations for a spec via the Deneb spec JSON web worker.
 */
export const doDenebSpecJsonWorkerRequest = (
    request: IDenebJsonProcessingWorkerRequest
) =>
    new Promise<IDenebJsonProcessingWorkerResponse>((resolve, reject) => {
        try {
            denebSpecJsonWorker.postMessage(request, [
                request.payload.spec.buffer
            ]);
            denebSpecJsonWorker.onmessage = (e) => {
                resolve(e.data);
            };
            denebSpecJsonWorker.onerror = (e) => {
                reject(e);
            };
        } catch (e) {
            reject(e);
        }
    });
