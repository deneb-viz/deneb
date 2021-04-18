/**
 * =======================
 * Common template helpers
 * =======================
 *
 * Templates re-use a lot of common stuff, so this section declares and exports
 * common objects that we can import as needed.
 */
import { BaseData, AutoSize } from 'vega';

import { dataRoles } from '../../capabilities.json';
import { IVegaTemplate, IVegaLiteTemplate } from '../types';

function autoSizeConfigSimple(): AutoSize {
    return {
        type: 'fit',
        contains: 'padding'
    };
}
function vegaDataModelRef(): BaseData {
    return {
        name: dataRoles[0].name
    };
}
export { autoSizeConfigSimple, vegaDataModelRef };

/**
 * ==================
 * Included templates
 * ==================
 */

// Vega-Lite
import { vlEmpty } from './vegaLite/vlEmpty';
import { vlBarSimple } from './vegaLite/vlBarSimple';
import { vlScatterColored } from './vegaLite/vlScatterColored';
import { vlLineConfInterval } from './vegaLite/vlLineConfInterval';
const vegaLiteTemplates: IVegaLiteTemplate[] = [
    vlEmpty,
    vlBarSimple,
    vlScatterColored,
    vlLineConfInterval
];

// Vega
import { vEmpty } from './vega/vEmpty';
import { vBarSimple } from './vega/vBarSimple';
import { vScatterColored } from './vega/vScatterColored';
import { vLineConfInterval } from './vega/vLineConfInterval';
const vegaTemplates: IVegaTemplate[] = [
    vEmpty,
    vBarSimple,
    vScatterColored,
    vLineConfInterval
];

const templates = {
    vega: <IVegaTemplate[]>vegaTemplates,
    vegaLite: <IVegaLiteTemplate[]>vegaLiteTemplates
};
export default templates;
