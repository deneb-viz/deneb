import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';

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
