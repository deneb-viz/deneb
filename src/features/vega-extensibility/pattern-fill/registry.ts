import reduce from 'lodash/reduce';

import {
    PATTERN_FILL_DEFAULT_FILL_COLOR,
    PATTERN_FILL_DEFAULT_SIZE,
    PATTERN_FILL_DEFAULT_STROKE_COLOR,
    PATTERN_FILL_DEFAULT_STROKE_WIDTH
} from '.';
import { shadeColor } from '../utils';
import {
    generateCircles,
    generateCrosshatch,
    generateDiagonalStripe,
    generateDots,
    generateHorizontalStripe,
    generateHoundstooth,
    generateVerticalStripe
} from './bindings';
import { IPatternFillDefinition, IPatternFillModifier } from '../types';

/**
 * All default fill patterns.
 */
const PATTERN_FILL_DEFINITIONS: IPatternFillDefinition[] = [
    {
        id: 'diagonal-stripe-1',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe
    },
    {
        id: 'diagonal-stripe-2',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe,
        strokeWidth: 2
    },
    {
        id: 'diagonal-stripe-3',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe,
        strokeWidth: 3
    },
    {
        id: 'diagonal-stripe-4',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe,
        strokeWidth: 4
    },
    {
        id: 'diagonal-stripe-5',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe,
        strokeWidth: 5
    },
    {
        id: 'diagonal-stripe-6',
        group: 'diagonal-stripe',
        generator: generateDiagonalStripe,
        strokeWidth: 6
    },
    {
        id: 'horizontal-stripe-1',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe
    },
    {
        id: 'horizontal-stripe-2',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 2
    },
    {
        id: 'horizontal-stripe-3',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 3
    },
    {
        id: 'horizontal-stripe-4',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 4
    },
    {
        id: 'horizontal-stripe-5',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 5
    },
    {
        id: 'horizontal-stripe-6',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 6
    },
    {
        id: 'horizontal-stripe-7',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 7
    },
    {
        id: 'horizontal-stripe-8',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 8
    },
    {
        id: 'horizontal-stripe-9',
        group: 'horizontal-stripe',
        generator: generateHorizontalStripe,
        strokeWidth: 9
    },
    {
        id: 'vertical-stripe-1',
        group: 'vertical-stripe',
        generator: generateVerticalStripe
    },
    {
        id: 'vertical-stripe-2',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 2
    },
    {
        id: 'vertical-stripe-3',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 3
    },
    {
        id: 'vertical-stripe-4',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 4
    },
    {
        id: 'vertical-stripe-5',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 5
    },
    {
        id: 'vertical-stripe-6',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 6
    },
    {
        id: 'vertical-stripe-7',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 7
    },
    {
        id: 'vertical-stripe-8',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 8
    },
    {
        id: 'vertical-stripe-9',
        group: 'vertical-stripe',
        generator: generateVerticalStripe,
        strokeWidth: 9
    },
    { id: 'circles-1', group: 'circles', generator: generateCircles },
    {
        id: 'circles-2',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 2
    },
    {
        id: 'circles-3',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 3
    },
    {
        id: 'circles-4',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 4
    },
    {
        id: 'circles-5',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 5
    },
    {
        id: 'circles-6',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 6
    },
    {
        id: 'circles-7',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 7
    },
    {
        id: 'circles-8',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 8
    },
    {
        id: 'circles-9',
        group: 'circles',
        generator: generateCircles,
        strokeWidth: 9
    },
    { id: 'dots-1', group: 'dots', generator: generateDots },
    {
        id: 'dots-2',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 2
    },
    {
        id: 'dots-3',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 3
    },
    {
        id: 'dots-4',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 4
    },
    {
        id: 'dots-5',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 5
    },
    {
        id: 'dots-6',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 6
    },
    {
        id: 'dots-7',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 7
    },
    {
        id: 'dots-8',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 8
    },
    {
        id: 'dots-9',
        group: 'dots',
        generator: generateDots,
        strokeWidth: 9
    },
    { id: 'crosshatch', group: 'other', generator: generateCrosshatch },
    { id: 'houndstooth', group: 'other', generator: generateHoundstooth }
];

// Modifiers to standard fill patterns, that effectively cross-joins the registry to provide alternative shades of grey
const PATTERN_FILL_MODIFIERS: IPatternFillModifier[] = [
    { suffix: '10', fgColorPercent: 0.1 },
    { suffix: '20', fgColorPercent: 0.2 },
    { suffix: '25', fgColorPercent: 0.25 },
    { suffix: '30', fgColorPercent: 0.3 },
    { suffix: '40', fgColorPercent: 0.4 },
    { suffix: '50', fgColorPercent: 0.5 },
    { suffix: '60', fgColorPercent: 0.6 },
    { suffix: '70', fgColorPercent: 0.7 },
    { suffix: '75', fgColorPercent: 0.75 },
    { suffix: '80', fgColorPercent: 0.8 },
    { suffix: '90', fgColorPercent: 0.9 }
];

/**
 * Resolve all definitions for their defaults, ready for inclusion in the
 * registry.
 */
export const getPackagedFillPatternDefs = () => {
    const stdDefs = PATTERN_FILL_DEFINITIONS.map((def) =>
        resolveFillPatternDefValues(def)
    );
    return [
        ...stdDefs,
        ...reduce(
            PATTERN_FILL_MODIFIERS,
            (result, pfm) => {
                stdDefs.forEach((def) => {
                    const pfMod: IPatternFillDefinition =
                        resolveFillPatternDefValues({
                            ...def,
                            ...{
                                id: `${def.id}-${pfm.suffix}`,
                                fgColor: shadeColor(
                                    def.fgColor,
                                    1 - pfm.fgColorPercent
                                )
                            }
                        });
                    result.push(pfMod);
                });
                return result;
            },
            <IPatternFillDefinition[]>[]
        )
    ];
};

/**
 * Applies all logic to resolve and handle fill pattern values, if omitted or incorrect
 */
export const resolveFillPatternDefValues = (
    def: IPatternFillDefinition
): IPatternFillDefinition => ({
    ...def,
    ...{
        fgColor: def.fgColor ?? PATTERN_FILL_DEFAULT_STROKE_COLOR,
        bgColor: def.bgColor ?? PATTERN_FILL_DEFAULT_FILL_COLOR,
        strokeWidth: def.strokeWidth ?? PATTERN_FILL_DEFAULT_STROKE_WIDTH,
        size: def.size ?? PATTERN_FILL_DEFAULT_SIZE
    }
});
