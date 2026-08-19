import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { patchVegaLiteSpec } from '../patch-vega-lite';
import { SIGNAL_DENEB_CONTAINER } from '../../signals';
import type { TopLevelSpec } from 'vega-lite';

describe('patchVegaLiteSpec', () => {
    it('should add denebContainer param', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {
                x: { field: 'category', type: 'nominal' },
                y: { field: 'amount', type: 'quantitative' }
            }
        };

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        const denebParam = patched.params?.find(
            (p: any) => p.name === SIGNAL_DENEB_CONTAINER
        );
        expect(denebParam).toBeDefined();
    });

    it('should set container width for standard layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.width).toBe('container');
    });

    it('should set container height for standard layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'point',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.height).toBe('container');
    });

    it('should not inject autosize when injecting container sizing', () => {
        // Vega-Lite infers autosize from container sizing itself, with
        // contains: 'padding' and the correct per-dimension fit type
        // ('fit', 'fit-x' or 'fit-y'). Injecting a full { type: 'fit' } here
        // broke specs with one explicit dimension: the explicit value was
        // reinterpreted as TOTAL chart size (axes included) instead of inner
        // plot size, shrinking the width/height signal. See #480 discussion.
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec);

        expect((patched as any).autosize).toBeUndefined();
    });

    it('should preserve user-specified autosize when injecting container sizing', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            autosize: { type: 'none' },
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect((patched as any).autosize).toEqual({ type: 'none' });
    });

    it('should preserve user-specified autosize string shorthand', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            autosize: 'fit',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect((patched as any).autosize).toBe('fit');
    });

    it('should not inject autosize when user has specified both width and height', () => {
        // When user specifies explicit dimensions, Deneb does not inject container sizing,
        // and therefore does not inject autosize either. The user is in full control.
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 500,
            height: 300,
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect((patched as any).autosize).toBeUndefined();
    });

    it('should preserve an explicit width as inner plot width when only height is containerized', () => {
        // Regression: a spec with explicit width (e.g. 380) and no height gets
        // height: 'container' injected. Vega-Lite must infer autosize 'fit-y'
        // so the explicit width remains the INNER plot width. Injecting
        // { type: 'fit' } reinterpreted 380 as total chart width and shrank
        // the width signal by the y-axis space (380 → ~300).
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 380,
            data: { values: [{ c: 'a', v: 1 }] },
            mark: 'bar',
            encoding: {
                y: { field: 'c', type: 'nominal' },
                x: { field: 'v', type: 'quantitative' }
            }
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.width).toBe(380);
        expect(patched.height).toBe('container');
        expect((patched as any).autosize).toBeUndefined();
        expect(compile(patched).spec.autosize).toEqual({
            type: 'fit-y',
            contains: 'padding'
        });
    });

    it('should not set container sizing for concat layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            concat: [
                {
                    data: { name: 'table' },
                    mark: 'bar',
                    encoding: {}
                },
                {
                    data: { name: 'table' },
                    mark: 'line',
                    encoding: {}
                }
            ]
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        expect(patched.width).toBeUndefined();
        expect(patched.height).toBeUndefined();
        expect((patched as any).autosize).toBeUndefined();
    });

    it('should not set container sizing for hconcat layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            hconcat: [
                { mark: 'bar', encoding: {} },
                { mark: 'line', encoding: {} }
            ]
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        expect(patched.width).toBeUndefined();
        expect(patched.height).toBeUndefined();
    });

    it('should not set container sizing for vconcat layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            vconcat: [
                { mark: 'bar', encoding: {} },
                { mark: 'line', encoding: {} }
            ]
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        expect(patched.width).toBeUndefined();
        expect(patched.height).toBeUndefined();
    });

    it('should not set container sizing for facet layout', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            facet: { field: 'category' },
            spec: { mark: 'bar', encoding: {} }
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        expect(patched.width).toBeUndefined();
        expect(patched.height).toBeUndefined();
    });

    it('should preserve user-specified width', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 500,
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.width).toBe(500);
    });

    it('should preserve user-specified height', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            height: 300,
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        expect(patched.height).toBe(300);
    });

    it('should preserve existing params', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            params: [
                { name: 'customParam', value: 42 },
                { name: 'anotherParam', value: 'test' }
            ],
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toHaveLength(3); // 2 custom + 1 denebContainer
        expect(
            patched.params?.find((p: any) => p.name === 'customParam')
        ).toBeDefined();
        expect(
            patched.params?.find((p: any) => p.name === 'anotherParam')
        ).toBeDefined();
        expect(
            patched.params?.find((p: any) => p.name === SIGNAL_DENEB_CONTAINER)
        ).toBeDefined();
    });

    it('should add additional params if provided', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const additionalParams = [
            { name: 'brushSelection', select: 'interval' },
            { name: 'filterValue', value: 0 }
        ];

        const patched = patchVegaLiteSpec(spec, {
            additionalParams: additionalParams as any
        });

        expect(patched.params).toHaveLength(3); // denebContainer + 2 additional
        expect(
            patched.params?.find((p: any) => p.name === 'brushSelection')
        ).toBeDefined();
        expect(
            patched.params?.find((p: any) => p.name === 'filterValue')
        ).toBeDefined();
    });

    it('should not mutate original spec', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const original = JSON.parse(JSON.stringify(spec));
        patchVegaLiteSpec(spec);

        expect(spec).toEqual(original);
    });

    it('should handle empty options object', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'circle',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {});

        expect(patched.params).toBeDefined();
        expect(
            patched.params?.find((p: any) => p.name === SIGNAL_DENEB_CONTAINER)
        ).toBeDefined();
    });

    it('should use container dimensions in denebContainer param', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 1024, height: 768 }
        });

        const denebParam = patched.params?.find(
            (p: any) => p.name === SIGNAL_DENEB_CONTAINER
        );

        expect(denebParam?.value.width).toBe(1024);
        expect(denebParam?.value.height).toBe(768);
    });

    it('should handle spec without containerDimensions', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec);

        const denebParam = patched.params?.find(
            (p: any) => p.name === SIGNAL_DENEB_CONTAINER
        );

        expect(denebParam?.value.width).toBe(0);
        expect(denebParam?.value.height).toBe(0);
    });

    it('should handle complex encoding', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            mark: { type: 'bar', tooltip: true },
            encoding: {
                x: {
                    field: 'category',
                    type: 'nominal',
                    axis: { labelAngle: -45 }
                },
                y: {
                    field: 'amount',
                    type: 'quantitative',
                    scale: { domain: [0, 100] }
                },
                color: {
                    field: 'group',
                    type: 'nominal',
                    legend: { orient: 'right' }
                }
            }
        };

        const patched = patchVegaLiteSpec(spec);

        expect(patched.mark).toEqual({ type: 'bar', tooltip: true });
        expect(patched.encoding).toBeDefined();
        expect(patched.params).toBeDefined();
    });

    it('should handle layer spec', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: 'table' },
            layer: [
                { mark: 'bar', encoding: {} },
                { mark: 'rule', encoding: {} }
            ]
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.layer).toHaveLength(2);
        expect(patched.params).toBeDefined();
        expect(patched.width).toBe('container');
        expect(patched.height).toBe('container');
    });

    it('should handle repeat spec', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            repeat: { row: ['a', 'b'] },
            spec: { mark: 'bar', encoding: {} }
        } as TopLevelSpec;

        const patched = patchVegaLiteSpec(spec);

        expect(patched.params).toBeDefined();
        expect(patched.width).toBe('container');
        expect(patched.height).toBe('container');
    });
});

describe('patchVegaLiteSpec Integration', () => {
    it('should work with realistic scatter plot spec', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            description: 'A scatterplot',
            data: { name: 'cars' },
            mark: 'point',
            encoding: {
                x: {
                    field: 'Horsepower',
                    type: 'quantitative'
                },
                y: {
                    field: 'Miles_per_Gallon',
                    type: 'quantitative'
                },
                color: {
                    field: 'Origin',
                    type: 'nominal'
                },
                size: {
                    field: 'Acceleration',
                    type: 'quantitative'
                }
            }
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 600, height: 400 }
        });

        expect(patched.data).toEqual({ name: 'cars' });
        expect(patched.mark).toBe('point');
        expect(patched.encoding).toBeDefined();
        expect(patched.params).toBeDefined();
        expect(patched.width).toBe('container');
        expect(patched.height).toBe('container');
    });
});

describe('patchVegaLiteSpec denebContainer guard', () => {
    it('should not inject a duplicate denebContainer param when the user spec defines one', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            params: [
                {
                    name: SIGNAL_DENEB_CONTAINER,
                    value: { width: 42, height: 24 }
                } as any
            ],
            data: { name: 'table' },
            mark: 'bar',
            encoding: {}
        };

        const patched = patchVegaLiteSpec(spec, {
            containerDimensions: { width: 800, height: 600 }
        });

        const denebParams = patched.params?.filter(
            (p: any) => p.name === SIGNAL_DENEB_CONTAINER
        );

        // Exactly one param named denebContainer - no duplicate-name error
        expect(denebParams).toHaveLength(1);
        // The user's definition wins (matches width/height precedent)
        expect((denebParams?.[0] as any).value).toEqual({
            width: 42,
            height: 24
        });
    });
});
