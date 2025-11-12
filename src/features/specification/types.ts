import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import { InterfaceMode } from '../interface';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Values for a spec's parse status.
 */
export type TSpecStatus = 'valid' | 'error' | 'new';

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
    provider: SpecProvider;
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
    provider: SpecProvider;
    spec: string;
    viewportHeight: number;
    viewportWidth: number;
    visualMode: InterfaceMode;
}
