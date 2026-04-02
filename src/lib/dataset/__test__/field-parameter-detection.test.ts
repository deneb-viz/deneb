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

    it('should handle field belonging to multiple parameters via first entry', () => {
        const fields: DetectableField[] = [
            {
                displayName: 'Shared Field',
                sourceIndex: 0,
                isMeasure: false,
                sourceFieldParameters: [
                    { displayName: 'Param A' },
                    { displayName: 'Param B' }
                ]
            }
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual(['Param A']);
    });
});
