import { IVisualDatasetValueRow } from '../../core/data';
import { TVisualMode } from '../../core/ui';
import { TSpecProvider } from '../../core/vega';

/**
 * Values for a spec's parse status.
 */
export type TSpecStatus = 'valid' | 'error' | 'new';

/**
 * Represents a parsed and validated specification.
 */
export interface ISpecification {
    errors: string[];
    spec: object | null;
    status: TSpecStatus;
    warns: string[];
    hashValue: string;
}

/**
 * Items we need to compare whether a specification has changed or not.
 */
export interface ISpecificationComparisonOptions {
    datasetHash: string;
    config: string;
    spec: string;
    provider: TSpecProvider;
    viewportHeight: number;
    viewportWidth: number;
}

/**
 * Options for parsing the specification.
 */
export interface ISpecificationParseOptions {
    config: string;
    datasetHash: string;
    logLevel: number;
    provider: TSpecProvider;
    spec: string;
    values: IVisualDatasetValueRow[];
    viewportHeight: number;
    viewportWidth: number;
    visualMode: TVisualMode;
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
