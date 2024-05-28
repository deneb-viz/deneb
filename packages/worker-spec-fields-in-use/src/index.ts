import { IWorkerSpecFieldsInUseMessage } from '@deneb-viz/core-dependencies';
import { getTrackingDataFromSpecification } from './field-tracking';

/**
 * Handle dataset processing requests from the main thread.
 */
self.onmessage = (e: MessageEvent<IWorkerSpecFieldsInUseMessage>) => {
    self.postMessage(getTrackingDataFromSpecification(e.data));
};
