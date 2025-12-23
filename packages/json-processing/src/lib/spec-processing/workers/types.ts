import {
    type DatasetFields,
    type FieldPatternReplacer
} from '@deneb-viz/data-core/field';
import {
    type TrackedDrilldownProperties,
    type TrackedFields
} from '../../field-tracking';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';

/**
 * Represents the worker that processes the JSON in a specification. Because these are typically very expensive, we
 * want to run them in a separate thread to avoid blocking the main thread.
 */
export interface IDenebSpecJsonWorker
    extends Omit<Worker, 'onmessage,postMessage'> {
    onmessage:
        | ((
              this: Worker,
              ev: MessageEvent<IDenebJsonProcessingWorkerResponse>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) => any)
        | null;
    postMessage(
        message: IDenebJsonProcessingWorkerRequest,
        options?: StructuredSerializeOptions
    ): void;
    postMessage(
        message: IDenebJsonProcessingWorkerRequest,
        transfer: Transferable[]
    ): void;
}

/**
 * Represents the request that the JSON processing worker can handle.
 */
export type IDenebJsonProcessingWorkerRequest =
    | IDenebTrackingRequestMessage
    | IDenebTokenizationRequestMessage
    | IDenebRemapRequestMessage;

/**
 * Represents the response that the JSON processing worker can provide.
 */
export type IDenebJsonProcessingWorkerResponse =
    | IDenebTrackingResponseMessage
    | IDenebTokenizationResponseMessage
    | IDenebRemapResponseMessage;

/**
 * The message format for a request to remap fields in a JSON specification.
 */
export interface IDenebRemapRequestMessage {
    type: 'remapping';
    payload: IDenebRemapRequestPayload;
}

/**
 * The payload for a request to remap fields in a JSON specification.
 */
export interface IDenebRemapRequestPayload {
    spec: Uint8Array;
    remapFields: UsermetaDatasetField[];
    trackedFields: TrackedFields;
}

/**
 * The message format for a response to a request to remap fields in a JSON specification.
 */
export interface IDenebRemapResponseMessage {
    type: 'remapping';
    payload: IDenebRemapResponsePayload;
}

/**
 * The payload for a response to a request to remap fields in a JSON specification.
 */
export interface IDenebRemapResponsePayload {
    spec: Uint8Array;
}

/**
 * The message format for a request to tokenize a JSON specification.
 */
export interface IDenebTokenizationRequestMessage {
    type: 'tokenization';
    payload: IDenebTokenizationRequestPayload;
}

/**
 * The payload for a request to tokenize a JSON specification.
 */
export interface IDenebTokenizationRequestPayload {
    spec: Uint8Array;
    trackedFields: TrackedFields;
    supplementaryReplacers: FieldPatternReplacer[];
    isRemap?: boolean;
}

/**
 * The message format for a response to a request to tokenize a JSON specification.
 */
export interface IDenebTokenizationResponseMessage {
    type: 'tokenization';
    payload: IDenebTokenizationResponsePayload;
}

/**
 * The payload for a response to a request to tokenize a JSON specification.
 */
export interface IDenebTokenizationResponsePayload {
    spec: Uint8Array;
}

/**
 * The message format for a request to get tracking information from a JSON specification, based on the current
 * dataset.
 */
export interface IDenebTrackingRequestMessage {
    type: 'tracking';
    payload: IDenebTrackingRequestPayload;
}

/**
 * The payload for a request to get tracking information from a JSON specification, based on the current dataset.
 */
export interface IDenebTrackingRequestPayload {
    spec: Uint8Array;
    fields: DatasetFields;
    hasDrilldown: boolean;
    trackedFieldsCurrent: TrackedFields;
    supplementaryPatterns: string[];
    reset?: boolean;
}

/**
 * The message format for a response to a request to get tracking information from a JSON specification.
 */
export interface IDenebTrackingResponseMessage {
    type: 'tracking';
    payload: IDenebTrackingResponsePayload;
}

/**
 * The payload for a response to a request to get tracking information from a JSON specification.
 */
export interface IDenebTrackingResponsePayload {
    trackedFields: TrackedFields;
    trackedDrilldown: TrackedDrilldownProperties;
}
