export {
    IVegaViewDatum,
    getVegaProvider,
    getVegaProvideri18n,
    getVegaSettings,
    getVegaVersion
};

import { getState } from '../../store';
import { getI18nValue } from '../../features/i18n';
import { PROVIDER_VERSIONS } from '../../../config';
import { SpecProvider } from '@deneb-viz/core-dependencies';

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
interface IVegaViewDatum {
    [key: string]: any;
}

/**
 * Convenience function to get current Vega provider from persisted properties.
 */
const getVegaProvider = () =>
    <SpecProvider>getVegaSettings().output.provider.value;

/**
 * Get the Vega provider, resolved for i18n.
 */
const getVegaProvideri18n = (provider?: SpecProvider) => {
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
