import { BaseData } from 'vega';
import { getConfig } from '../core/utils/config';
import { dataRoles } from '../../capabilities.json';

/**
 * =======================
 * Common template helpers
 * =======================
 *
 * Templates re-use a lot of common stuff, so this section declares and exports
 * common objects that we can import as needed.
 */

export function vegaDataModelRef(): BaseData {
    return {
        name: dataRoles[0].name
    };
}
export const providerInfo = getConfig().providerResources;
export const vegaProviderInfo = providerInfo.vega.schemaUrl;
export const vegaLiteProviderInfo = providerInfo.vegaLite.schemaUrl;
export const authorInfo = 'Deneb';
