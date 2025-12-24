import { type SpecificationParseOptions } from '@deneb-viz/json-processing/spec-processing';
import { type StoreState } from './state';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Get the options for parsing the specification and configuration from the
 * store.
 */
// TODO: need to use visual settings rather than project while we are on the legacy parse workflow
export const getSpecificationParseOptions = (
    state: StoreState
): SpecificationParseOptions => ({
    config: state.visualSettings.vega.output.jsonConfig.value,
    logLevel: state.project.logLevel,
    provider: state.project.provider as SpecProvider,
    spec: state.visualSettings.vega.output.jsonSpec.value,
    translations: {
        configParseError: state.i18n.translate('Text_Debug_Error_Config_Parse'),
        specParseError: state.i18n.translate('Text_Debug_Error_Spec_Parse')
    },
    viewportHeight: state.interface.viewport?.height ?? 0,
    viewportWidth: state.interface.viewport?.width ?? 0,
    validateSchema: state.interface.type === 'editor'
});
