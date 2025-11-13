import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { type InterfaceMode } from '@deneb-viz/app-core';

/**
 * After parsing, we need to patch content. This represents the results of
 * that operation.
 */
export interface IContentPatchResult {
    result: Vega.Spec | VegaLite.TopLevelSpec | null;
    errors: string[];
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
