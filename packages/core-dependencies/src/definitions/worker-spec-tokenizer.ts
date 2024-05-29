import { TokenPatternReplacer, TrackedFields } from './json-processing';

/**
 * Represents the worker that replaces a JSONC spec's fields with tokens.
 */
export interface IWorkerSpecTokenizer
    extends Omit<Worker, 'onmessage,postMessage'> {
    onmessage:
        | ((
              this: Worker,
              ev: MessageEvent<IWorkerSpecTokenizerResponse>
          ) => any)
        | null;
    postMessage(message: IWorkerSpecTokenizerMessage): void;
}

/**
 * Options for processing a specification and replacing field names with tokens.
 */
export interface IWorkerSpecTokenizerMessage {
    spec: string;
    trackedFields: TrackedFields;
    supplementaryReplacers: TokenPatternReplacer[];
    isRemap?: boolean;
}

/**
 * Represents the response from the tokenizer worker to the main thread.
 */
export interface IWorkerSpecTokenizerResponse {
    spec: string;
}
