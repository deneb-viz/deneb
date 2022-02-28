import { BaseType, select, Selection } from 'd3-selection';
import reduce from 'lodash/reduce';
import { getUrlRefById } from '../ui/selectors';

const svgPatternContainerId = 'customFillPatterns',
    defaultPatternStrokeColor = '#000000',
    defaultPatternFillColor = 'transparent',
    defaultPatternStrokeWidth = 1,
    defaultPatternSize = 10;

/**
 * SVG pattern fills need to be managed using pre-defined `patterns` and IDs that can be referenced within a spec.
 * This class provides us with a service that will generate a bunch of pre-defined patterns and greyscale variants
 * that we can use with url(#) references in a `fill` attribute. We also expose a dynamic pattern generator that
 * can be called using and ExpressionRef, and this will attempt to generate a color variant of a defined pattern.
 */
export class FillPatternServices {
    // All 'registered' definitions; are added to the DOM container.
    patternDefRegistry: IFillPatternDefinition[] = standardFillPatterns();
    // SVG container reserved for pattern fills.
    private container: Selection<SVGSVGElement, unknown, null, undefined>;

    // Adds a pattern definition to the registry and performs a data join to ensure that the DOM is current
    addPatternDef = (def: IFillPatternDefinition) => {
        this.patternDefRegistry.push(def);
        this.joinPatternFillData();
    };

    // D3 data join on the pattern registry
    joinPatternFillData = () => {
        this.container
            .select('defs')
            .selectAll('pattern')
            .data(this.patternDefRegistry)
            .join(
                (enter) => enter.append('pattern').call(bindPatternAttrs),
                (update) => update,
                (exit) => exit.remove()
            );
    };

    // Add the SVG registry container to the DOM and bind it
    setPatternContainer = (container: HTMLElement) => {
        this.container = initialiseFillContainer(container);
        this.joinPatternFillData();
    };

    // Intended to be used from an `ExpressionRef` in Vega/Vega-Lite. Generate a pattern ID for supplied id/stroke/fill combination,
    // check registry for it, and add an overloaded version of an OOB pattern def if not. This ID can then be referenced by a spec
    // and can be used to produce more colorful patterns in lieu of greyscale ones.
    generateDynamicPattern = (
        id: string,
        fgColor: string = defaultPatternStrokeColor,
        bgColor: string = defaultPatternFillColor
    ) => {
        const modId = escape(
                `${id}-${fgColor}-${bgColor}`.replace(/[^a-zA-Z0-9-_\-]+/g, '-')
            ),
            found =
                this.patternDefRegistry?.findIndex((fpd) => fpd.id === modId) >
                -1,
            template = this.patternDefRegistry?.find((fdp) => fdp.id === id);
        if (!found && template) {
            this.addPatternDef(
                resolveFillPatternDefValues({
                    ...template,
                    ...{
                        id: modId,
                        fgColor,
                        bgColor,
                        group: 'dynamic'
                    }
                })
            );
        }
        return getUrlRefById(modId);
    };
}

// Defined fill pattern groups
type TFillPatternGroup =
    | 'diagonal-stripe'
    | 'horizontal-stripe'
    | 'vertical-stripe'
    | 'circles'
    | 'dots'
    | 'other'
    | 'dynamic';

// Everything required to generate and bind a fill pattern to the DOM
interface IFillPatternDefinition {
    id: string;
    group: TFillPatternGroup;
    fgColor?: string;
    bgColor?: string;
    strokeWidth?: number;
    size?: number;
    generator: (
        selection: Selection<
            SVGPatternElement,
            IFillPatternDefinition,
            BaseType,
            unknown
        >
    ) => void;
}

// Structure of a modifier - used to produce variations of a particular fill pattern definition
interface IFillPatternModifier {
    suffix?: string;
    stroke: string;
}

// Create and bind a pattern element with correct identifying attributes and standard logic
const bindPatternAttrs = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .attr('id', (d) => d.id)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', (d) => d.size)
        .attr('height', (d) => d.size)
        .each((d, i, e) =>
            d.generator(select<SVGPatternElement, IFillPatternDefinition>(e[i]))
        );
};

// Create and bind attributes for a pattern's bounding rectangle element.
const bindPatternBoundingRect = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .append('rect')
        .attr('width', (d) => d.size)
        .attr('height', (d) => d.size)
        .attr('fill', (d) => d.bgColor);
};

// Generator function to create the diagonal stripe pattern group
const generateDiagonalStripe = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .call(bindPatternBoundingRect)
        .append('path')
        .attr(
            'd',
            (d) =>
                `M0 ${d.size}L${d.size} 0ZM${d.size + d.strokeWidth} ${
                    d.size - d.strokeWidth
                }L${d.size - d.strokeWidth} ${d.size + d.strokeWidth}ZM-${
                    d.strokeWidth
                } ${d.strokeWidth}L${d.strokeWidth} -${d.strokeWidth}Z`
        )
        .attr('stroke', (d) => d.fgColor)
        .attr('stroke-width', (d) => d.strokeWidth);
};

// Generator function to create the horizontal stripe pattern group
const generateHorizontalStripe = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .call(bindPatternBoundingRect)
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', (d) => d.size)
        .attr('height', (d) => d.strokeWidth)
        .attr('fill', (d) => d.fgColor);
};

// Generator function to create the vertical stripe pattern group
const generateVerticalStripe = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .call(bindPatternBoundingRect)
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', (d) => d.strokeWidth)
        .attr('height', (d) => d.size)
        .attr('fill', (d) => d.fgColor);
};

// Generator function to create the circles pattern group
const generateCircles = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    const scale = (sw: number) => 0.5 + 0.5 * sw;
    selection
        .call(bindPatternBoundingRect)
        .append('circle')
        .attr('cx', (d) => scale(d.strokeWidth))
        .attr('cy', (d) => scale(d.strokeWidth))
        .attr('r', (d) => scale(d.strokeWidth))
        .attr('fill', (d) => d.fgColor);
};

// Generator function to create the dots pattern group
const generateDots = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .call(bindPatternBoundingRect)
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', (d) => d.strokeWidth)
        .attr('height', (d) => d.strokeWidth)
        .attr('fill', (d) => d.fgColor);
};

// Generator function to create the crosshatch pattern
const generateCrosshatch = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    selection
        .call(bindPatternBoundingRect)
        .append('path')
        .attr('d', (d) => `M0 0L${d.size} ${d.size}ZM${d.size} 0L0 ${d.size}Z`)
        .attr('stroke', (d) => d.fgColor)
        .attr('stroke-width', (d) => d.strokeWidth / 2);
};

// Generator function to create the houndstooth pattern
const generateHoundstooth = (
    selection: Selection<
        SVGPatternElement,
        IFillPatternDefinition,
        BaseType,
        unknown
    >
) => {
    const p1Scale = 0.4,
        pQ1 = 0.25,
        pQ2 = 0.5,
        pQ3 = 0.75;
    selection
        .call(bindPatternBoundingRect)
        .append('path')
        .attr('d', (d) => `M0 0L${d.size * p1Scale} ${d.size * p1Scale}`)
        .attr('stroke', (d) => d.fgColor)
        .attr('fill', (d) => d.fgColor)
        .attr('stroke-width', (d) => d.strokeWidth);
    selection
        .append('path')
        .attr(
            'd',
            (d) =>
                `M${d.size * pQ1} 0L${d.size * pQ2} ${d.size * pQ1}L${
                    d.size * pQ2
                } ${d.size * pQ2}L${d.size - 1} ${d.size - 1}L${d.size * pQ2} ${
                    d.size * pQ2
                }L${d.size} ${d.size * pQ2}L${d.size} 0`
        )
        .attr('stroke', (d) => d.fgColor)
        .attr('fill', (d) => d.fgColor)
        .attr('stroke-width', (d) => d.strokeWidth);
    selection
        .append('path')
        .attr(
            'd',
            (d) =>
                `M${d.size * pQ2} ${d.size}L${d.size * pQ2} ${d.size * pQ3}L${
                    d.size * pQ3
                } ${d.size}`
        )
        .attr('stroke', (d) => d.fgColor)
        .attr('fill', (d) => d.fgColor)
        .attr('stroke-width', (d) => d.strokeWidth);
};

// Registry of standard fill pattern definitions
const fillPatternDefinitions: IFillPatternDefinition[] = [
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
const fillPatternModifiers: IFillPatternModifier[] = [
    { suffix: '10', stroke: '#e6e6e6' },
    { suffix: '20', stroke: '#cccccc' },
    { suffix: '25', stroke: '#bfbfbf' },
    { suffix: '30', stroke: '#b3b3b3' },
    { suffix: '40', stroke: '#999999' },
    { suffix: '50', stroke: '#808080' },
    { suffix: '60', stroke: '#666666' },
    { suffix: '70', stroke: '#4d4d4d' },
    { suffix: '75', stroke: '#404040' },
    { suffix: '80', stroke: '#333333' },
    { suffix: '90', stroke: '#1a1a1a' }
];

// Cross-join the above definitions and modifiers to produce a standard set of pattern defs
const standardFillPatterns = (): IFillPatternDefinition[] => [
    ...fillPatternDefinitions.map((fpd) => resolveFillPatternDefValues(fpd)),
    ...reduce(
        fillPatternModifiers,
        (result, fpm) => {
            fillPatternDefinitions.forEach((fpd) => {
                const fpdMod: IFillPatternDefinition = {
                    ...fpd,
                    ...{
                        id: `${fpd.id}-${fpm.suffix}`,
                        fgColor: fpm.stroke
                    }
                };
                result.push(resolveFillPatternDefValues(fpdMod));
            });
            return result;
        },
        <IFillPatternDefinition[]>[]
    )
];

// Applies all logic to resolve and handle fill pattern values, if omitted or incorrect
const resolveFillPatternDefValues = (
    def: IFillPatternDefinition
): IFillPatternDefinition => ({
    ...def,
    ...{
        fgColor: def.fgColor ?? defaultPatternStrokeColor,
        bgColor: def.bgColor ?? defaultPatternFillColor,
        strokeWidth: def.strokeWidth ?? defaultPatternStrokeWidth,
        size: def.size ?? defaultPatternSize
    }
});

// Creates an independent SVG element in the visual DOM that we can use to hold pattern IDs
const initialiseFillContainer = (container: HTMLElement) => {
    const svg = select(container)
        .append('svg')
        .attr('height', 0)
        .attr('width', 0)
        .attr('id', svgPatternContainerId)
        .style('display', 'block');
    svg.append('defs');
    return svg;
};
