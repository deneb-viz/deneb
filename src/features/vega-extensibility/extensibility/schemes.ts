import { scheme } from 'vega';
import {
    divergentPalette,
    divergentPaletteMed,
    ordinalPalette,
    powerBiColors
} from './powerbi-theme';

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
    { name: 'pbiColorNominal', values: powerBiColors() },
    {
        name: 'pbiColorOrdinal',
        values: ordinalPalette(ordinalColorCount)
    },
    { name: 'pbiColorLinear', values: divergentPalette() },
    { name: 'pbiColorDivergent', values: divergentPaletteMed() }
];
