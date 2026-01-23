import { describe, expect, it } from 'vitest';
import {
    patchVegaSpecWithData,
    patchVegaLiteSpecWithData,
    patchSpecWithData,
    DATASET_DEFAULT_NAME
} from '../patch-data';
import type { Spec } from 'vega';
import type { TopLevelSpec } from 'vega-lite';

describe('DATASET_DEFAULT_NAME', () => {
    it('should be "dataset"', () => {
        expect(DATASET_DEFAULT_NAME).toBe('dataset');
    });
});

describe('patchVegaSpecWithData', () => {
    it('should add dataset to empty data array', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [
            { category: 'A', amount: 28 },
            { category: 'B', amount: 55 }
        ];

        const patched = patchVegaSpecWithData(spec, values);

        expect(patched.data).toBeDefined();
        expect(patched.data).toHaveLength(1);
        expect(patched.data![0].name).toBe(DATASET_DEFAULT_NAME);
        expect((patched.data![0] as any).values).toEqual(values);
    });

    it('should add dataset alongside existing data sources', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            data: [{ name: 'other', values: [{ x: 1 }] }],
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaSpecWithData(spec, values);

        expect(patched.data).toHaveLength(2);
        expect(patched.data![0].name).toBe('other');
        expect(patched.data![1].name).toBe(DATASET_DEFAULT_NAME);
    });

    it('should replace existing dataset values', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            data: [
                { name: DATASET_DEFAULT_NAME, values: [{ old: 'data' }] },
                { name: 'other', values: [{ x: 1 }] }
            ],
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaSpecWithData(spec, values);

        expect(patched.data).toHaveLength(2);
        const datasetEntry = patched.data!.find(
            (d) => d.name === DATASET_DEFAULT_NAME
        );
        expect((datasetEntry as any).values).toEqual(values);
    });

    it('should preserve other data source properties when replacing', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            data: [
                {
                    name: DATASET_DEFAULT_NAME,
                    values: [{ old: 'data' }],
                    transform: [{ type: 'filter', expr: 'datum.amount > 0' }]
                }
            ],
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaSpecWithData(spec, values);

        const datasetEntry = patched.data!.find(
            (d) => d.name === DATASET_DEFAULT_NAME
        );
        expect((datasetEntry as any).values).toEqual(values);
        expect((datasetEntry as any).transform).toBeDefined();
        expect((datasetEntry as any).transform[0].type).toBe('filter');
    });

    it('should not mutate original spec', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            data: [{ name: 'other', values: [{ x: 1 }] }],
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const original = JSON.parse(JSON.stringify(spec));
        patchVegaSpecWithData(spec, values);

        expect(spec).toEqual(original);
    });

    it('should not mutate original values', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];
        const originalValues = JSON.parse(JSON.stringify(values));

        const patched = patchVegaSpecWithData(spec, values);

        // Mutate the patched spec's values
        (patched.data![0] as any).values[0].category = 'MODIFIED';

        // Original values should be unchanged
        expect(values).toEqual(originalValues);
    });

    it('should handle empty values array', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values: any[] = [];

        const patched = patchVegaSpecWithData(spec, values);

        expect(patched.data).toHaveLength(1);
        expect((patched.data![0] as any).values).toEqual([]);
    });

    it('should handle complex nested data values', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [
            {
                category: 'A',
                nested: { deep: { value: 123 } },
                array: [1, 2, 3]
            }
        ];

        const patched = patchVegaSpecWithData(spec, values);

        expect((patched.data![0] as any).values[0].nested.deep.value).toBe(123);
        expect((patched.data![0] as any).values[0].array).toEqual([1, 2, 3]);
    });

    it('should preserve other spec properties', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            height: 200,
            padding: 5,
            signals: [{ name: 'mySignal', value: 42 }],
            scales: [{ name: 'xscale', type: 'linear' }],
            marks: [{ type: 'rect' }]
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaSpecWithData(spec, values);

        expect(patched.width).toBe(400);
        expect(patched.height).toBe(200);
        expect(patched.padding).toBe(5);
        expect(patched.signals).toHaveLength(1);
        expect(patched.scales).toHaveLength(1);
        expect(patched.marks).toHaveLength(1);
    });
});

describe('patchVegaLiteSpecWithData', () => {
    it('should add dataset to empty datasets object', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [
            { category: 'A', amount: 28 },
            { category: 'B', amount: 55 }
        ];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.datasets).toBeDefined();
        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual(values);
    });

    it('should add dataset alongside existing datasets', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            datasets: {
                other: [{ x: 1 }]
            },
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.datasets!.other).toEqual([{ x: 1 }]);
        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual(values);
    });

    it('should replace existing dataset values', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            datasets: {
                [DATASET_DEFAULT_NAME]: [{ old: 'data' }],
                other: [{ x: 1 }]
            },
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual(values);
        expect(patched.datasets!.other).toEqual([{ x: 1 }]);
    });

    it('should not mutate original spec', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            datasets: {
                other: [{ x: 1 }]
            },
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const original = JSON.parse(JSON.stringify(spec));
        patchVegaLiteSpecWithData(spec, values);

        expect(spec).toEqual(original);
    });

    it('should not mutate original values', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];
        const originalValues = JSON.parse(JSON.stringify(values));

        const patched = patchVegaLiteSpecWithData(spec, values);

        // Mutate the patched spec's values
        patched.datasets![DATASET_DEFAULT_NAME][0].category = 'MODIFIED';

        // Original values should be unchanged
        expect(values).toEqual(originalValues);
    });

    it('should handle empty values array', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values: any[] = [];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual([]);
    });

    it('should handle spec without existing datasets property', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.datasets).toBeDefined();
        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual(values);
    });

    it('should preserve other spec properties', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: 'My Chart',
            description: 'A test chart',
            width: 400,
            height: 200,
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {
                x: { field: 'category', type: 'nominal' },
                y: { field: 'amount', type: 'quantitative' }
            }
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchVegaLiteSpecWithData(spec, values);

        expect(patched.title).toBe('My Chart');
        expect(patched.description).toBe('A test chart');
        expect(patched.width).toBe(400);
        expect(patched.height).toBe(200);
        expect(patched.mark).toBe('bar');
        expect(patched.encoding).toBeDefined();
    });
});

describe('patchSpecWithData', () => {
    it('should dispatch to patchVegaSpecWithData for vega provider', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchSpecWithData(spec, values, 'vega') as Spec;

        expect(patched.data).toBeDefined();
        expect(patched.data![0].name).toBe(DATASET_DEFAULT_NAME);
    });

    it('should dispatch to patchVegaLiteSpecWithData for vega-lite provider', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const patched = patchSpecWithData(
            spec,
            values,
            'vega-lite'
        ) as TopLevelSpec;

        expect(patched.datasets).toBeDefined();
        expect(patched.datasets![DATASET_DEFAULT_NAME]).toEqual(values);
    });

    it('should produce same result as direct function call for vega', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            data: [{ name: 'other', values: [] }],
            marks: []
        };
        const values = [{ category: 'A', amount: 28 }];

        const fromDispatch = patchSpecWithData(spec, values, 'vega');
        const fromDirect = patchVegaSpecWithData(spec, values);

        expect(fromDispatch).toEqual(fromDirect);
    });

    it('should produce same result as direct function call for vega-lite', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            datasets: { other: [] },
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ category: 'A', amount: 28 }];

        const fromDispatch = patchSpecWithData(spec, values, 'vega-lite');
        const fromDirect = patchVegaLiteSpecWithData(spec, values);

        expect(fromDispatch).toEqual(fromDirect);
    });
});

describe('Data Cloning Behavior', () => {
    it('should deeply clone values to prevent shared references (Vega)', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [{ nested: { value: 1 } }];

        const patched = patchVegaSpecWithData(spec, values);

        // Modify original nested value
        values[0].nested.value = 999;

        // Patched spec should not be affected
        expect((patched.data![0] as any).values[0].nested.value).toBe(1);
    });

    it('should deeply clone values to prevent shared references (Vega-Lite)', () => {
        const spec: TopLevelSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { name: DATASET_DEFAULT_NAME },
            mark: 'bar',
            encoding: {}
        };
        const values = [{ nested: { value: 1 } }];

        const patched = patchVegaLiteSpecWithData(spec, values);

        // Modify original nested value
        values[0].nested.value = 999;

        // Patched spec should not be affected
        expect(patched.datasets![DATASET_DEFAULT_NAME][0].nested.value).toBe(1);
    });

    it('should clone arrays within values (Vega)', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const values = [{ items: [1, 2, 3] }];

        const patched = patchVegaSpecWithData(spec, values);

        // Modify original array
        values[0].items.push(4);

        // Patched spec should not be affected
        expect((patched.data![0] as any).values[0].items).toEqual([1, 2, 3]);
    });
});
