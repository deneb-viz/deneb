import { type SpecificationParseOptions } from '@deneb-viz/json-processing/spec-processing';
import { type StoreState } from './state';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Get the options for parsing the specification and configuration from the
 * store.
 */
export const getSpecificationParseOptions = (
    state: StoreState
): SpecificationParseOptions => ({
    config: state.visualSettings.vega.output.jsonConfig.value,
    datasetHash: state.dataset.hashValue,
    logLevel: state.visualSettings.vega.logging.logLevel.value as number,
    provider: state.visualSettings.vega.output.provider.value as SpecProvider,
    spec: state.visualSettings.vega.output.jsonSpec.value,
    viewportHeight: state.visualViewportReport.height,
    viewportWidth: state.visualViewportReport.width,
    validateSchema: state.interface.mode === 'Editor'
});
