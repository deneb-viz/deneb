import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { BindingsOrient } from '@deneb-viz/vega-runtime/spec-processing';

import { getPaneOffset } from '../../bindings-pane-state';

/** The element Vega draws a chart into, with either renderer. */
const CHART_SELECTOR = 'canvas.marks, svg.marks';

/**
 * How far the pane moves back from its edge to sit after a chart smaller
 * than its space (see `getPaneOffset`), or `null` until a chart in the space
 * has been measured.
 *
 * The chart is found and measured in the DOM, not through the view in React
 * state, which can reach the pane after the browser has painted the chart.
 * vega-embed empties the space at the start of every embed and Vega then
 * adds a new chart; a mutation observer sees both before the next paint, and
 * a resize observer sees the chart and its space change size. Each new offset
 * is committed with `flushSync`, so the pane moves in the frame in which the
 * chart changes. While an embed has removed the chart, the last offset is
 * kept, so the pane does not fall back to its edge and return.
 *
 * Sizes are layout sizes, which a transform does not change, so the offset
 * holds inside the editor's scaled preview.
 */
export const usePaneOffset = (
    space: HTMLElement | null,
    orient: BindingsOrient
): number | null => {
    const [offset, setOffset] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (!space) {
            return;
        }
        let chart: Element | null = null;
        let lastOffset: number | null = null;
        const resizeObserver = new ResizeObserver(() => commitOffset());

        /** Follow the chart now in the space, and measure it against the space. */
        const measureOffset = (): number | null => {
            const currentChart = space.querySelector(CHART_SELECTOR);
            if (currentChart !== chart) {
                if (chart) {
                    resizeObserver.unobserve(chart);
                }
                chart = currentChart;
                if (chart) {
                    resizeObserver.observe(chart);
                }
            }
            if (!chart || chart.clientWidth === 0 || chart.clientHeight === 0) {
                return null;
            }
            return getPaneOffset(
                orient,
                { width: space.clientWidth, height: space.clientHeight },
                { width: chart.clientWidth, height: chart.clientHeight }
            );
        };

        const commitOffset = () => {
            const nextOffset = measureOffset();
            if (nextOffset !== null && nextOffset !== lastOffset) {
                lastOffset = nextOffset;
                flushSync(() => setOffset(nextOffset));
            }
        };

        // Svg charts add and remove their own elements as they redraw, so
        // only a change of the chart element itself is worth measuring.
        const mutationObserver = new MutationObserver(() => {
            if (space.querySelector(CHART_SELECTOR) !== chart) {
                commitOffset();
            }
        });

        // Inside a layout effect the update is committed before the browser
        // paints, without flushSync, which React does not allow here.
        lastOffset = measureOffset();
        if (lastOffset !== null) {
            setOffset(lastOffset);
        }
        resizeObserver.observe(space);
        mutationObserver.observe(space, { childList: true, subtree: true });
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [space, orient]);

    return offset;
};
