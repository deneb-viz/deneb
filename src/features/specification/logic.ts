import { getState } from '../../store';

import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { getVisualSettings } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Determine if the current spec is 'unversioned', meaning that it's the same
 * as the default properties.
 */
export const isUnversionedSpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const defaults = DEFAULTS.vega;
    const {
        vega: {
            output: {
                jsonSpec: { value: jsonSpec },
                jsonConfig: { value: jsonConfig }
            }
        }
    } = getVisualSettings();
    return jsonSpec === defaults.jsonSpec && jsonConfig === defaults.jsonConfig;
};

/**
 * Determine if a visual is 'versioned' based on persisted properties.
 */
const isVersionedSpec = () => {
    const {
        visualSettings: {
            developer: {
                versioning: {
                    version: { value: denebVersion }
                }
            },
            vega: {
                output: {
                    version: { value: providerVersion }
                }
            }
        }
    } = getState();
    return (denebVersion && providerVersion) || false;
};
