/**
 * Values for a spec's parse status.
 */
export type TSpecStatus = 'valid' | 'error' | 'new';

/**
 * Represents a compiled specification, including any additional metadata needed to manage it downstream in the UI.
 */
export interface ICompiledSpec {
    status: TSpecStatus;
    spec: object;
    rawSpec: string;
}

/**
 * Represents the results of a fix and repair operation.
 */
export interface IFixResult {
    spec: IFixStatus;
    config: IFixStatus;
    success: boolean;
    dismissed: boolean;
    error?: string;
}

/**
 * Represents the status and additional metadata of a fix and repair against an individual specification or config component.
 */
export interface IFixStatus {
    success: boolean;
    text: string;
    error?: string;
}
