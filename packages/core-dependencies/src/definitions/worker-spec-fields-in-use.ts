import { IDataset } from './dataset';
import { TrackedDrilldownProperties, TrackedFields } from './json-processing';

/**
 * Represents the worker that processes a specification for field tracking.
 */
export interface IWorkerSpecFieldsInUse
    extends Omit<Worker, 'onmessage,postMessage'> {
    onmessage:
        | ((
              this: Worker,
              ev: MessageEvent<IWorkerSpecFieldsInUseResponse>
          ) => any)
        | null;
    postMessage(message: IWorkerSpecFieldsInUseMessage): void;
}

/**
 * Options for processing a specification for known dataset fields and retrieving the tracking information.
 */
export interface IWorkerSpecFieldsInUseMessage {
    spec: string;
    dataset: IDataset;
    trackedFieldsCurrent: TrackedFields;
    reset?: boolean;
}

/**
 * Represents the response from the field tracking worker to the main thread.
 */
export interface IWorkerSpecFieldsInUseResponse {
    trackedFields: TrackedFields;
    trackedDrilldown: TrackedDrilldownProperties;
}
