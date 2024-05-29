import { IWorkerSpecTokenizerMessage } from '@deneb-viz/core-dependencies';
import { getTokenizedSpec } from './tokenizer';

/**
 * Handle dataset processing requests from the main thread.
 */
self.onmessage = (e: MessageEvent<IWorkerSpecTokenizerMessage>) => {
    self.postMessage(getTokenizedSpec(e.data));
};
