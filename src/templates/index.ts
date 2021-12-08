/**
 * =======================
 * Common template helpers
 * =======================
 *
 * Templates re-use a lot of common stuff, so this section declares and exports
 * common objects that we can import as needed.
 */
import { Spec, BaseData } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { getConfig } from '../core/utils/config';

import { dataRoles } from '../../capabilities.json';

function vegaDataModelRef(): BaseData {
    return {
        name: dataRoles[0].name
    };
}
const providerInfo = getConfig().providerResources,
    vegaProviderInfo = providerInfo.vega.schemaUrl,
    vegaLiteProviderInfo = providerInfo.vegaLite.schemaUrl,
    authorInfo = 'Deneb';

export { authorInfo, vegaDataModelRef, vegaProviderInfo, vegaLiteProviderInfo };

/**
 * ==================
 * Included templates
 * ==================
 */

// Vega-Lite
import { vlEmpty } from './vegaLite/vlEmpty';
import { vlBarSimple } from './vegaLite/vlBarSimple';
import { vlBarGrouped } from './vegaLite/vlBarGrouped';
import { vlScatterColored } from './vegaLite/vlScatterColored';
import { vlLineConfInterval } from './vegaLite/vlLineConfInterval';
const vegaLiteTemplates: TopLevelSpec[] = [
    vlEmpty,
    vlBarSimple,
    vlBarGrouped,
    vlScatterColored,
    vlLineConfInterval
];

// Vega
import { vEmpty } from './vega/vEmpty';
import { vBarSimple } from './vega/vBarSimple';
import { vScatterColored } from './vega/vScatterColored';
import { vLineConfInterval } from './vega/vLineConfInterval';
const vegaTemplates: Spec[] = [
    vEmpty,
    vBarSimple,
    vScatterColored,
    vLineConfInterval
];

const templates = {
    vega: vegaTemplates,
    vegaLite: vegaLiteTemplates
};
export default templates;
