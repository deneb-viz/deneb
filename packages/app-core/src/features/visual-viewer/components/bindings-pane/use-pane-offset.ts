import { useLayoutEffect, useState } from 'react';
import type { BindingsOrient } from '@deneb-viz/vega-runtime/spec-processing';

import { useVegaView } from '@deneb-viz/vega-react';

import { getPaneOffset } from '../../bindings-pane-state';

/**
 * How far the pane moves back from its edge to sit after a chart smaller
 * than its space (see `getPaneOffset`), kept up to date as the chart and its
 * space change size. Zero when there is no space to measure.
 *
 * The chart is what Vega draws into its container: a canvas or an SVG
 * element, the container's first child. Sizes are layout sizes, which a
 * transform does not change, so the offset holds inside the editor's scaled
 * preview. The first measure is taken before the browser paints, so a new
 * chart is never painted with its pane still on the edge.
 */
export const usePaneOffset = (
    space: HTMLElement | null,
    orient: BindingsOrient
): number => {
    const { view } = useVegaView();
    const [offset, setOffset] = useState(0);

    useLayoutEffect(() => {
        const chart = view?.container()?.firstElementChild;
        if (!space || !chart) {
            setOffset(0);
            return;
        }
        const measure = () => {
            setOffset(
                getPaneOffset(
                    orient,
                    { width: space.clientWidth, height: space.clientHeight },
                    { width: chart.clientWidth, height: chart.clientHeight }
                )
            );
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(space);
        observer.observe(chart);
        return () => observer.disconnect();
    }, [space, view, orient]);

    return offset;
};
