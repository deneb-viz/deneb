import {
    IDenebSpecJsonWorker,
    IDenebJsonProcessingWorkerRequest,
    IDenebJsonProcessingWorkerResponse
} from '@deneb-viz/core-dependencies';
import {
    getUrlFromBlob,
    getWorkerAsBlobFromRawFile,
    getWorkerFromUrl
} from '@deneb-viz/utils/worker';
import denebSpecJson from '@deneb-viz/worker-spec-json-processing';

/**
 * Used for asynchronous processing of JSON specifications.
 */
const denebSpecJsonWorker: IDenebSpecJsonWorker = getWorkerFromUrl(
    getUrlFromBlob(getWorkerAsBlobFromRawFile(denebSpecJson as string))
);

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
