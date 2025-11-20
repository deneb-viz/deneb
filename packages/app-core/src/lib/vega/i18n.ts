import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Get the Vega provider, resolved for i18n.
 */
export const getVegaProviderI18n = (provider: SpecProvider) => {
    return getI18nValue(
        provider === 'vegaLite' ? 'Provider_VegaLite' : 'Provider_Vega'
    );
};
