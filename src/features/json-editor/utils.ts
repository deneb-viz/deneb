import { getVegaSettings } from '../../core/vega';
import { TEditorRole } from './types';

/**
 * For the given role, retrieve its value from the visual properties (via store).
 */
export const getEditorInitialText = (role: TEditorRole) => {
    const { jsonConfig, jsonSpec } = getVegaSettings();
    return role === 'Spec' ? jsonSpec || '' : jsonConfig;
};
