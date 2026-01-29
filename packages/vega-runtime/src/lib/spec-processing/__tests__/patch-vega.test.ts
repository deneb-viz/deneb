import { describe, expect, it } from 'vitest';
import { patchVegaSpec } from '../patch-vega';
import { SIGNAL_DENEB_CONTAINER } from '../../signals';
import type { Spec } from 'vega';

describe('patchVegaSpec', () => {
    it('should add denebContainer signal', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            marks: []
        };

        const patched = patchVegaSpec(spec);

        expect(patched.signals).toBeDefined();
        const denebSignal = patched.signals?.find(
            (s: any) => s.name === SIGNAL_DENEB_CONTAINER
        );
        expect(denebSignal).toBeDefined();
        expect(denebSignal?.value).toHaveProperty('width');
        expect(denebSignal?.value).toHaveProperty('height');
    });

    it('should set responsive width if not specified', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            height: 200,
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.width).toBeDefined();
        expect(patched.width).toHaveProperty('signal');
        expect((patched.width as any).signal).toContain('denebContainer.width');
    });

    it('should set responsive height if not specified', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.height).toBeDefined();
        expect(patched.height).toHaveProperty('signal');
        expect((patched.height as any).signal).toContain(
            'denebContainer.height'
        );
    });

    it('should preserve user-specified width', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 500,
            height: 200,
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.width).toBe(500);
    });

    it('should preserve user-specified height', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 300,
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.height).toBe(300);
    });

    it('should preserve existing signals', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            signals: [
                { name: 'customSignal', value: 42 },
                { name: 'anotherSignal', value: 'test' }
            ],
            marks: []
        };

        const patched = patchVegaSpec(spec);

        expect(patched.signals).toHaveLength(3); // 2 custom + 1 denebContainer
        expect(patched.signals?.find((s: any) => s.name === 'customSignal')).toBeDefined();
        expect(patched.signals?.find((s: any) => s.name === 'anotherSignal')).toBeDefined();
        expect(
            patched.signals?.find((s: any) => s.name === SIGNAL_DENEB_CONTAINER)
        ).toBeDefined();
    });

    it('should add additional signals if provided', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            marks: []
        };

        const additionalSignals = [
            { name: 'zoomLevel', value: 1 },
            { name: 'panX', value: 0 }
        ];

        const patched = patchVegaSpec(spec, { additionalSignals });

        expect(patched.signals).toHaveLength(3); // denebContainer + 2 additional
        expect(patched.signals?.find((s: any) => s.name === 'zoomLevel')).toBeDefined();
        expect(patched.signals?.find((s: any) => s.name === 'panX')).toBeDefined();
    });

    it('should use container dimensions in denebContainer signal', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 1024, height: 768 }
        });

        const denebSignal = patched.signals?.find(
            (s: any) => s.name === SIGNAL_DENEB_CONTAINER
        );

        expect(denebSignal?.value.width).toBe(1024);
        expect(denebSignal?.value.height).toBe(768);
    });

    it('should handle spec without containerDimensions', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            marks: []
        };

        const patched = patchVegaSpec(spec);

        const denebSignal = patched.signals?.find(
            (s: any) => s.name === SIGNAL_DENEB_CONTAINER
        );

        expect(denebSignal?.value.width).toBe(0);
        expect(denebSignal?.value.height).toBe(0);
    });

    it('should not mutate original spec', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            marks: []
        };

        const original = JSON.parse(JSON.stringify(spec));
        patchVegaSpec(spec);

        expect(spec).toEqual(original);
    });

    it('should handle complex spec with data and marks', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            data: [
                {
                    name: 'table',
                    values: [
                        { category: 'A', amount: 28 },
                        { category: 'B', amount: 55 }
                    ]
                }
            ],
            scales: [
                {
                    name: 'xscale',
                    type: 'band',
                    domain: { data: 'table', field: 'category' },
                    range: 'width'
                }
            ],
            marks: [
                {
                    type: 'rect',
                    from: { data: 'table' },
                    encode: {
                        update: {
                            x: { scale: 'xscale', field: 'category' }
                        }
                    }
                }
            ]
        };

        const patched = patchVegaSpec(spec);

        expect(patched.data).toBeDefined();
        expect(patched.scales).toBeDefined();
        expect(patched.marks).toBeDefined();
        expect(patched.signals).toBeDefined();
    });

    it('should handle spec with signal expressions', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: { signal: 'customWidth' },
            height: { signal: 'customHeight' },
            signals: [
                { name: 'customWidth', value: 800 },
                { name: 'customHeight', value: 600 }
            ],
            marks: []
        };

        const patched = patchVegaSpec(spec);

        // Should preserve signal-based dimensions
        expect(patched.width).toEqual({ signal: 'customWidth' });
        expect(patched.height).toEqual({ signal: 'customHeight' });
    });

    it('should handle empty options object', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };

        const patched = patchVegaSpec(spec, {});

        expect(patched.signals).toBeDefined();
        expect(
            patched.signals?.find((s: any) => s.name === SIGNAL_DENEB_CONTAINER)
        ).toBeDefined();
    });

    it('should handle spec with padding', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            padding: 5,
            marks: []
        };

        const patched = patchVegaSpec(spec);

        expect(patched.padding).toBe(5);
    });

    it('should handle spec with autosize', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            autosize: { type: 'fit', contains: 'padding' },
            marks: []
        };

        const patched = patchVegaSpec(spec);

        expect(patched.autosize).toEqual({ type: 'fit', contains: 'padding' });
    });

    it('should not add responsive width when user has width signal with init', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            signals: [
                {
                    name: 'width',
                    init: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
                    on: [
                        {
                            update: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
                            events: 'window:resize'
                        }
                    ]
                }
            ],
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        // Should NOT add top-level width property (would conflict with signal's init)
        expect(patched.width).toBeUndefined();
        // Should still add responsive height since no height signal exists
        expect(patched.height).toHaveProperty('signal');
    });

    it('should not add responsive height when user has height signal with init', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            signals: [
                {
                    name: 'height',
                    init: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
                    on: [
                        {
                            update: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
                            events: 'window:resize'
                        }
                    ]
                }
            ],
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        // Should NOT add top-level height property (would conflict with signal's init)
        expect(patched.height).toBeUndefined();
        // Should still add responsive width since no width signal exists
        expect(patched.width).toHaveProperty('signal');
    });

    it('should not add responsive dimensions when user has both width and height signals', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            signals: [
                {
                    name: 'width',
                    init: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
                    on: [
                        {
                            update: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
                            events: 'window:resize'
                        }
                    ]
                },
                {
                    name: 'height',
                    init: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
                    on: [
                        {
                            update: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
                            events: 'window:resize'
                        }
                    ]
                }
            ],
            marks: []
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        // Should NOT add top-level width/height properties
        expect(patched.width).toBeUndefined();
        expect(patched.height).toBeUndefined();
        // User signals should be preserved
        expect(patched.signals?.find((s: any) => s.name === 'width')).toBeDefined();
        expect(patched.signals?.find((s: any) => s.name === 'height')).toBeDefined();
    });
});

describe('patchVegaSpec Integration', () => {
    it('should work with realistic bar chart spec', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            description: 'A basic bar chart',
            data: [
                {
                    name: 'table',
                    values: []
                }
            ],
            scales: [
                {
                    name: 'xscale',
                    type: 'band',
                    domain: { data: 'table', field: 'category' },
                    range: 'width',
                    padding: 0.05
                },
                {
                    name: 'yscale',
                    domain: { data: 'table', field: 'amount' },
                    nice: true,
                    range: 'height'
                }
            ],
            axes: [
                { orient: 'bottom', scale: 'xscale' },
                { orient: 'left', scale: 'yscale' }
            ],
            marks: [
                {
                    type: 'rect',
                    from: { data: 'table' },
                    encode: {
                        enter: {
                            x: { scale: 'xscale', field: 'category' },
                            width: { scale: 'xscale', band: 1 },
                            y: { scale: 'yscale', field: 'amount' },
                            y2: { scale: 'yscale', value: 0 }
                        },
                        update: {
                            fill: { value: 'steelblue' }
                        }
                    }
                }
            ]
        };

        const patched = patchVegaSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.data).toHaveLength(1);
        expect(patched.scales).toHaveLength(2);
        expect(patched.axes).toHaveLength(2);
        expect(patched.marks).toHaveLength(1);
        expect(patched.signals).toBeDefined();
        expect(patched.width).toHaveProperty('signal');
        expect(patched.height).toHaveProperty('signal');
    });
});
