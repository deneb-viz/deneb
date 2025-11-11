import {
    getUrlFromBlob,
    getWorkerAsBlobFromRawFile,
    getWorkerFromUrl
} from '@deneb-viz/utils/worker';
import {
    type IDenebJsonProcessingWorkerRequest,
    type IDenebJsonProcessingWorkerResponse,
    type IDenebRemapResponseMessage,
    type IDenebTokenizationResponseMessage,
    type IDenebTrackingResponseMessage,
    type IDenebSpecJsonWorker
} from './types';
import denebSpecJson from '../../../../dist/worker/spec-processing.worker.js';

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

export type {
    IDenebJsonProcessingWorkerRequest,
    IDenebRemapResponseMessage,
    IDenebTokenizationResponseMessage,
    IDenebTrackingResponseMessage
};
