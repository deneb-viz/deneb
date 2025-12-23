import { select, Selection, BaseType } from 'd3-selection';

import { type PatternFillResolved } from './types';

/**
 * Create and bind a pattern element with correct identifying attributes and
 * standard logic.
 */
export const bindPatternAttrs = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
        BaseType,
        unknown
    >
) => {
    selection
        .attr('id', (d) => d.id)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', (d) => d.size)
        .attr('height', (d) => d.size)
        .each((d, i, e) => {
            const el = e[i];
            if (el) {
                d.generator(select<SVGPatternElement, PatternFillResolved>(el));
            }
        });
};

/**
 * Create and bind attributes for a pattern's bounding rectangle element.
 */
const bindPatternBoundingRect = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the diagonal stripe pattern group.
 */
export const generateDiagonalStripe = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the horizontal stripe pattern group.
 */
export const generateHorizontalStripe = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the vertical stripe pattern group.
 */
export const generateVerticalStripe = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the circles pattern group.
 */
export const generateCircles = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the dots pattern group.
 */
export const generateDots = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the crosshatch pattern.
 */
export const generateCrosshatch = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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

/**
 * Generator function to create the houndstooth pattern.
 */
export const generateHoundstooth = (
    selection: Selection<
        SVGPatternElement,
        PatternFillResolved,
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
