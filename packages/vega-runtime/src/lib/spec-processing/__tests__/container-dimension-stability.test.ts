import { describe, expect, it } from 'vitest';
import { parse, View, type Spec } from 'vega';
import { patchVegaSpec } from '../patch-vega';
import { SIGNAL_DENEB_CONTAINER } from '../../signals';

const CONTAINER = { width: 267, height: 283 };

/**
 * `autosize: fit` makes Vega write its fitted value into the `height` signal.
 * Marks positioned in `encode.enter` run once per datum for the life of the
 * view, so anything that resets `height` re-fits against a scenegraph that
 * has not moved.
 */
const FIT_CONFIG = { autosize: { type: 'fit', contains: 'padding' } };

/**
 * A text mark below the data rectangle, positioned entirely in `encode.enter`
 * — the shape from issue #773. `yscale(0)` sits below the domain minimum, so
 * the label overflows and the fit has something to correct for.
 */
const OVERFLOWING_ENTER_SPEC: Spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    padding: { top: 10 },
    data: [
        {
            name: 'dataset',
            values: [
                { category: 'a', amount: 10 },
                { category: 'b', amount: 50 }
            ]
        }
    ],
    scales: [
        {
            name: 'yscale',
            domain: { data: 'dataset', field: 'amount' },
            range: 'height'
        }
    ],
    marks: [
        {
            type: 'text',
            from: { data: 'dataset' },
            encode: {
                enter: {
                    text: { value: 'label' },
                    y: { scale: 'yscale', value: 0 },
                    baseline: { value: 'middle' },
                    dy: { value: 15 }
                }
            }
        }
    ]
};

const runPatchedView = async (containerDimensions: {
    width: number;
    height: number;
}) => {
    const spec = patchVegaSpec(OVERFLOWING_ENTER_SPEC, { containerDimensions });
    const view = new View(parse(spec, FIT_CONFIG), { renderer: 'none' });
    await view.runAsync();
    return view;
};

describe('container dimension stability', () => {
    it('leaves the fitted layout unchanged when only scroll fields are written', async () => {
        const view = await runPatchedView(CONTAINER);
        const heightAtEmbed = view.signal('height');
        const widthAtEmbed = view.signal('width');

        // Every fresh view gets exactly this write from the post-embed
        // reconcile: the box is unchanged, and the scroll extents move off the
        // compile-time seed of 0.
        view.signal(SIGNAL_DENEB_CONTAINER, {
            width: CONTAINER.width,
            height: CONTAINER.height,
            scrollWidth: CONTAINER.width,
            scrollHeight: 300,
            scrollTop: 0,
            scrollLeft: 0
        });
        await view.runAsync();

        expect(view.signal('height')).toBe(heightAtEmbed);
        expect(view.signal('width')).toBe(widthAtEmbed);
    });

    it('fits the overflowing label inside the view', async () => {
        const view = await runPatchedView(CONTAINER);

        view.signal(SIGNAL_DENEB_CONTAINER, {
            width: CONTAINER.width,
            height: CONTAINER.height,
            scrollWidth: CONTAINER.width,
            scrollHeight: 300,
            scrollTop: 0,
            scrollLeft: 0
        });
        await view.runAsync();

        // `fit` guarantees the whole scenegraph sits inside the requested
        // box; a clobbered fit pushes the bottom of it past that.
        expect(view.scenegraph().root.bounds.y2).toBeLessThanOrEqual(
            CONTAINER.height
        );
    });
});
