import { IDenebJsonProcessingWorkerRequest } from '@deneb-viz/core-dependencies';
import { getTrackingDataFromSpecification } from './field-tracking';
import { getTokenizedSpec } from './tokenizer';
import { getRemappedSpecification } from './remapping';

/**
 * Handle dataset processing requests from the main thread.
 */
self.onmessage = (e: MessageEvent<IDenebJsonProcessingWorkerRequest>) => {
    switch (e.data.type) {
        case 'tracking':
            return self.postMessage({
                type: e.data.type,
                payload: getTrackingDataFromSpecification(e.data.payload)
            });
        case 'tokenization':
            return self.postMessage({
                type: e.data.type,
                payload: getTokenizedSpec(e.data.payload)
            });
        case 'remapping':
            return self.postMessage({
                type: e.data.type,
                payload: getRemappedSpecification(e.data.payload)
            });
    }
};
