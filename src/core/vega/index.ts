export {
    IVegaViewDatum,
    TSpecProvider,
    TSpecRenderMode,
    editorConfigOverLoad,
    getVegaProvider,
    getVegaProvideri18n,
    getVegaSettings,
    getVegaVersion,
    getViewDataset
};

import cloneDeep from 'lodash/cloneDeep';

import { getState } from '../../store';
import { getI18nValue } from '../../features/i18n';
import { PROVIDER_VERSIONS } from '../../../config';

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
interface IVegaViewDatum {
    [key: string]: any;
}

/**
 * Valid providers for the visual.
 */
type TSpecProvider = 'vega' | 'vegaLite';

/**
 * Used to constrain Vega rendering to supported types.
 */
type TSpecRenderMode = 'svg' | 'canvas';

const editorConfigOverLoad = {
    background: null, // so we can defer to the Power BI background, if applied
    customFormatTypes: true
};

/**
 * Convenience function to get current Vega provider from persisted properties.
 */
const getVegaProvider = () => <TSpecProvider>getVegaSettings().provider;

/**
 * Get the Vega provider, resolved for i18n.
 */
const getVegaProvideri18n = (provider?: TSpecProvider) => {
    const resolved = provider ?? getVegaProvider();
    return getI18nValue(
        resolved === 'vegaLite' ? 'Provider_VegaLite' : 'Provider_Vega'
    );
};

/**
 * For the current provider, get the version from our package configuration.
 */
const getVegaVersion = () => PROVIDER_VERSIONS[getVegaProvider()];

/**
 * Convenience function to get current Vega/Spec settings from the visual objects (as we use this a lot).
 */
const getVegaSettings = () => getState().visualSettings.vega;

/**
 * Create the `data` object for the Vega view specification. Ensures that the dataset applied to the visual is a cloned, mutable copy of the store version.
 */
const getViewDataset = () => ({
    dataset: cloneDeep(getState().dataset?.values ?? [])
});
