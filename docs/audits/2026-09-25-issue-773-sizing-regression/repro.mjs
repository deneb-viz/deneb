/**
 * Runnable reproduction for issue #773 — enter-encoded Vega marks are laid out
 * at the wrong scale range after the container signal is written.
 *
 * Run from the repository root: `node docs/audits/2026-09-25-issue-773-sizing-regression/repro.mjs`
 *
 * The spec below is the minimal shape from the issue's attached report: an
 * `autosize: fit` Vega spec whose text marks overflow the data rectangle
 * vertically and are positioned entirely in `encode.enter`.
 */
import { View, parse } from 'vega';

const CONTAINER_WIDTH = 267;
const CONTAINER_HEIGHT = 283;

const VALUES = [10, 20, 30, 40, 50].map((quantity, index) => ({
    Type: 'ABCDE'[index],
    Quantity: quantity
}));

const CONFIG = { autosize: { contains: 'padding', type: 'fit' } };

/** The mark whose geometry lives in `encode.enter` and overflows below `height`. */
const axisLabelMark = (encodeBlock) => ({
    type: 'text',
    name: 'axis labels',
    from: { data: 'dataset' },
    encode: {
        [encodeBlock]: {
            text: { signal: "split(datum.Type,' ')" },
            y: { scale: 'yscale', value: '0' },
            x: { scale: 'xscale', field: 'Type', band: 0.5 },
            baseline: { value: 'middle' },
            dy: { value: 15 }
        }
    }
});

const buildSpec = ({ encodeBlock, sizing }) => {
    const spec = {
        padding: { top: 10 },
        data: [{ name: 'dataset', values: VALUES }],
        signals: [
            {
                name: 'denebContainer',
                value: {
                    width: CONTAINER_WIDTH,
                    height: CONTAINER_HEIGHT,
                    scrollWidth: 0,
                    scrollHeight: 0,
                    scrollTop: 0,
                    scrollLeft: 0
                }
            }
        ],
        scales: [
            {
                name: 'xscale',
                type: 'band',
                domain: { data: 'dataset', field: 'Type' },
                range: 'width',
                padding: 0.3
            },
            {
                name: 'yscale',
                domain: { data: 'dataset', field: 'Quantity' },
                range: 'height'
            }
        ],
        marks: [
            {
                type: 'symbol',
                from: { data: 'dataset' },
                encode: {
                    enter: {
                        size: { value: 200 },
                        y: { scale: 'yscale', field: 'Quantity' },
                        x: { scale: 'xscale', field: 'Type', band: 0.5 }
                    }
                }
            },
            axisLabelMark(encodeBlock)
        ]
    };
    if (sizing === 'object-signal') {
        spec.width = { signal: 'denebContainer.width' };
        spec.height = { signal: 'denebContainer.height' };
    } else {
        spec.width = CONTAINER_WIDTH;
        spec.height = CONTAINER_HEIGHT;
    }
    return spec;
};

/** Data-rectangle height, derived from the spacing between the symbol marks. */
const measure = (view) => {
    const marks = [];
    const walk = (item) => {
        if (!item) return;
        if (item.marktype) marks.push(item);
        (item.items || []).forEach(walk);
    };
    walk(view.scenegraph().root);
    const dotY = marks
        .find((mark) => mark.marktype === 'symbol')
        .items.map((item) => item.y);
    return {
        heightSignal: view.signal('height'),
        dataRectHeight: +((dotY[0] - dotY[1]) * 4).toFixed(1),
        sceneBottom: +view.scenegraph().root.bounds.y2.toFixed(1)
    };
};

const run = async ({ label, encodeBlock, sizing }) => {
    const view = new View(parse(buildSpec({ encodeBlock, sizing }), CONFIG), {
        renderer: 'none'
    });
    await view.runAsync();
    const atEmbed = measure(view);

    // What the post-embed reconcile does on EVERY fresh view: re-write
    // denebContainer with an identical box, seeding the scroll extents that
    // the compile-time init leaves at 0.
    view.signal('denebContainer', {
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        scrollWidth: CONTAINER_WIDTH,
        scrollHeight: 300,
        scrollTop: 0,
        scrollLeft: 0
    });
    await view.runAsync();
    const afterWrite = measure(view);

    const drifted = atEmbed.dataRectHeight !== afterWrite.dataRectHeight;
    console.log(label);
    console.log(
        `   at embed:          height=${atEmbed.heightSignal} dataRectHeight=${atEmbed.dataRectHeight} sceneBottom=${atEmbed.sceneBottom}`
    );
    console.log(
        `   after scroll seed: height=${afterWrite.heightSignal} dataRectHeight=${afterWrite.dataRectHeight} sceneBottom=${afterWrite.sceneBottom}   ${drifted ? '*** DRIFT ***' : 'stable'}\n`
    );
    return drifted;
};

const drift = [
    await run({
        label: 'enter-encoded + width/height bound to the denebContainer object',
        encodeBlock: 'enter',
        sizing: 'object-signal'
    }),
    await run({
        label: 'update-encoded + width/height bound to the denebContainer object',
        encodeBlock: 'update',
        sizing: 'object-signal'
    }),
    await run({
        label: 'enter-encoded + width/height as literals',
        encodeBlock: 'enter',
        sizing: 'literal'
    })
];

console.assert(drift[0] === true, 'expected the reported defect to reproduce');
console.assert(drift[1] === false, 'update encoding should be immune');
console.assert(drift[2] === false, 'literal sizing should be immune');
console.log(
    drift[0] && !drift[1] && !drift[2]
        ? 'Reproduced: only the enter-encoded + object-signal-sized combination drifts.'
        : 'Unexpected result — the defect or the mitigation has changed.'
);
