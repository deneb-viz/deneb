import { scheme } from 'vega';
import {
    divergentPalette,
    divergentPaletteMed,
    ordinalPalette,
    powerBiColors
} from './powerbi-theme';
import {
    VEGA_SCHEME_POWERBI_DIVERGENT,
    VEGA_SCHEME_POWERBI_LINEAR,
    VEGA_SCHEME_POWERBI_NOMINAL,
    VEGA_SCHEME_POWERBI_ORDINAL
} from '../../../constants';

/**
 * A custom scheme that should be added to the Vega view.
 */
interface ICustomScheme {
    name: string;
    values: string[] | ((t: number) => string);
}

/**
 * Bind custom schemes to the view that sync to the report theme.
 */
export const registerCustomSchemes = (ordinalColorCount: number) =>
    schemesRegistry(ordinalColorCount).forEach((s) => scheme(s.name, s.values));

/**
 * Registry of custom schemes to add to the Vega view.
 */
const schemesRegistry = (ordinalColorCount: number): ICustomScheme[] => [
    { name: VEGA_SCHEME_POWERBI_NOMINAL, values: powerBiColors() },
    {
        name: VEGA_SCHEME_POWERBI_ORDINAL,
        values: ordinalPalette(ordinalColorCount)
    },
    { name: VEGA_SCHEME_POWERBI_LINEAR, values: divergentPalette() },
    { name: VEGA_SCHEME_POWERBI_DIVERGENT, values: divergentPaletteMed() }
];
