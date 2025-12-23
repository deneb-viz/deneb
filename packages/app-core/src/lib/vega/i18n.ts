import { SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getDenebState } from '../../state';

/**
 * Get the Vega provider, resolved for i18n.
 */
export const getVegaProviderI18n = (provider: SpecProvider) => {
    const { translate } = getDenebState().i18n;
    return translate(
        provider === 'vegaLite' ? 'Provider_VegaLite' : 'Provider_Vega'
    );
};
