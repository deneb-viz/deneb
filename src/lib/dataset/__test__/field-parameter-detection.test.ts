// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    detectFieldParameterGroups,
    type DetectableField
} from '../field-parameter-detection';

const makeField = (
    displayName: string,
    sourceIndex: number,
    isMeasure: boolean,
    parameterName?: string
): DetectableField => ({
    displayName,
    sourceIndex,
    isMeasure,
    sourceFieldParameters: parameterName
        ? [{ displayName: parameterName }]
        : undefined
});

const makeFieldWithParams = (
    displayName: string,
    sourceIndex: number,
    isMeasure: boolean,
    parameterNames: string[]
): DetectableField => ({
    displayName,
    sourceIndex,
    isMeasure,
    sourceFieldParameters: parameterNames.map((displayName) => ({ displayName }))
});

describe('detectFieldParameterGroups', () => {
    it('should return empty groups when no fields have parameters', () => {
        const fields = [
            makeField('Year', 0, false),
            makeField('$ Sales', 0, true)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups).toEqual({});
        expect(result.regularFieldIndices).toEqual([0, 1]);
    });

    it('should group fields by parameter name', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Dynamic Category'),
            makeField('Segment', 1, false, 'Dynamic Category'),
            makeField('Product', 2, false, 'Dynamic Category'),
            makeField('$ Sales', 0, true)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Dynamic Category'
        ]);
        const group = result.parameterGroups['Dynamic Category'];
        expect(group.parameterName).toBe('Dynamic Category');
        expect(group.componentNames).toEqual([
            'Country Code',
            'Segment',
            'Product'
        ]);
        expect(group.componentFieldIndices).toEqual([0, 1, 2]);
        expect(group.componentRoles).toEqual([
            'grouping',
            'grouping',
            'grouping'
        ]);
        expect(result.regularFieldIndices).toEqual([3]);
    });

    it('should handle multiple parameters', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Dynamic Category'),
            makeField('Segment', 1, false, 'Dynamic Category'),
            makeField('$ Sales', 0, true, 'Dynamic Measure'),
            makeField('# Units', 1, true, 'Dynamic Measure'),
            makeField('Year', 2, false)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Dynamic Category',
            'Dynamic Measure'
        ]);
        expect(
            result.parameterGroups['Dynamic Category'].componentFieldIndices
        ).toEqual([0, 1]);
        expect(
            result.parameterGroups['Dynamic Measure'].componentFieldIndices
        ).toEqual([2, 3]);
        expect(result.regularFieldIndices).toEqual([4]);
    });

    it('should preserve DataView order within groups', () => {
        const fields = [
            makeField('Product', 0, false, 'Dynamic Category'),
            makeField('Country Code', 1, false, 'Dynamic Category'),
            makeField('Segment', 2, false, 'Dynamic Category')
        ];
        const result = detectFieldParameterGroups(fields);
        const group = result.parameterGroups['Dynamic Category'];
        expect(group.componentNames).toEqual([
            'Product',
            'Country Code',
            'Segment'
        ]);
    });

    it('should detect mixed column/measure parameters', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Mixed Param'),
            makeField('$ Sales', 0, true, 'Mixed Param')
        ];
        const result = detectFieldParameterGroups(fields);
        const group = result.parameterGroups['Mixed Param'];
        expect(group.hasMixedRoles).toBe(true);
        expect(group.componentRoles).toEqual(['grouping', 'aggregation']);
    });

    it('should not flag single-type parameter as mixed', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Cat Param'),
            makeField('Segment', 1, false, 'Cat Param')
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups['Cat Param'].hasMixedRoles).toBe(false);
    });

    it('should handle empty fields array', () => {
        const result = detectFieldParameterGroups([]);
        expect(result.parameterGroups).toEqual({});
        expect(result.regularFieldIndices).toEqual([]);
    });

    it('should register a field in every parameter group named in sourceFieldParameters', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('Shared Field', 0, false, [
                'Param A',
                'Param B'
            ])
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Param A',
            'Param B'
        ]);
        expect(result.parameterGroups['Param A']).toMatchObject({
            parameterName: 'Param A',
            componentNames: ['Shared Field'],
            componentFieldIndices: [0],
            componentRoles: ['grouping'],
            hasMixedRoles: false
        });
        expect(result.parameterGroups['Param B']).toMatchObject({
            parameterName: 'Param B',
            componentNames: ['Shared Field'],
            componentFieldIndices: [0],
            componentRoles: ['grouping'],
            hasMixedRoles: false
        });
        expect(result.regularFieldIndices).toEqual([]);
    });

    it('should register two fields each belonging to the same two parameters in DataView order', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('Field One', 0, false, [
                'Param A',
                'Param B'
            ]),
            makeFieldWithParams('Field Two', 1, false, [
                'Param A',
                'Param B'
            ])
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups['Param A'].componentNames).toEqual([
            'Field One',
            'Field Two'
        ]);
        expect(result.parameterGroups['Param A'].componentFieldIndices).toEqual(
            [0, 1]
        );
        expect(result.parameterGroups['Param B'].componentNames).toEqual([
            'Field One',
            'Field Two'
        ]);
        expect(result.parameterGroups['Param B'].componentFieldIndices).toEqual(
            [0, 1]
        );
    });

    it('should support a shared field plus distinct fields across parameters', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('Shared', 0, false, ['P', 'Q']),
            makeField('Only P', 1, false, 'P'),
            makeField('Only Q', 2, false, 'Q')
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups['P'].componentFieldIndices).toEqual([
            0, 1
        ]);
        expect(result.parameterGroups['P'].componentNames).toEqual([
            'Shared',
            'Only P'
        ]);
        expect(result.parameterGroups['Q'].componentFieldIndices).toEqual([
            0, 2
        ]);
        expect(result.parameterGroups['Q'].componentNames).toEqual([
            'Shared',
            'Only Q'
        ]);
        expect(result.regularFieldIndices).toEqual([]);
    });

    it('should classify a field with empty sourceFieldParameters as regular', () => {
        const fields: DetectableField[] = [
            {
                displayName: 'Lonely Field',
                sourceIndex: 0,
                isMeasure: false,
                sourceFieldParameters: []
            }
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups).toEqual({});
        expect(result.regularFieldIndices).toEqual([0]);
    });

    it('should dedup duplicate parameter-name entries within a single field', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('Doubled Field', 0, false, [
                'Param A',
                'Param A'
            ])
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual(['Param A']);
        expect(result.parameterGroups['Param A'].componentFieldIndices).toEqual(
            [0]
        );
        expect(result.parameterGroups['Param A'].componentNames).toEqual([
            'Doubled Field'
        ]);
    });

    it('should not flag hasMixedRoles for a measure shared across parameters', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('Shared Measure', 0, true, [
                'Selected Metric',
                'Secondary Metric'
            ])
        ];
        const result = detectFieldParameterGroups(fields);
        expect(
            result.parameterGroups['Selected Metric'].componentRoles
        ).toEqual(['aggregation']);
        expect(
            result.parameterGroups['Selected Metric'].hasMixedRoles
        ).toBe(false);
        expect(
            result.parameterGroups['Secondary Metric'].componentRoles
        ).toEqual(['aggregation']);
        expect(
            result.parameterGroups['Secondary Metric'].hasMixedRoles
        ).toBe(false);
    });

    it('should preserve first-occurrence ordering of parameter group keys across fields', () => {
        const fields: DetectableField[] = [
            makeFieldWithParams('F1', 0, false, ['Beta', 'Alpha']),
            makeFieldWithParams('F2', 1, false, ['Alpha', 'Gamma'])
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Beta',
            'Alpha',
            'Gamma'
        ]);
    });
});
