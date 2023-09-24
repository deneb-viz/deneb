import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import { TSpecProvider } from '../../core/vega';
import { InterfaceMode } from '../interface';

/**
 * Values for a spec's parse status.
 */
export type TSpecStatus = 'valid' | 'error' | 'new';

/**
 * When we perform parsing of the JSON editor or property content (prior to
 * patching it), we need to know if there are any errors so we can log them.
 */
export interface IContentParseResult {
    result: object | null;
    errors: string[];
}

/**
 * After parsing, we need to patch content. This represents the results of
 * that operation.
 */
export interface IContentPatchResult {
    result: Vega.Spec | VegaLite.TopLevelSpec | null;
    errors: string[];
}

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
    viewportHeight: number;
    viewportWidth: number;
    visualMode: InterfaceMode;
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
