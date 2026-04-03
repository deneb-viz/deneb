import { describe, expect, it } from 'vitest';
import { buildDataRow } from '../build-data-row';
import type {
    ProcessingPlan,
    ParameterProcessingInstruction,
    SupportFieldValueProvider,
    FieldProcessingInstruction
} from '../types';

const mockProvider: SupportFieldValueProvider = {
    getFormatString: () => '',
    getFormattedValue: (value) => `formatted:${value}`,
    getHighlightValue: (_fi, _ri, base) => base
};

const makeParameterInstruction = (
    overrides?: Partial<ParameterProcessingInstruction>
): ParameterProcessingInstruction => ({
    kind: 'parameter',
    encodedName: 'Dynamic Category',
    componentIndices: [0, 1, 2],
    namesArray: ['Country Code', 'Segment', 'Product'],
    emitFormat: false,
    emitFormatted: false,
    ...overrides
});

describe('buildDataRow — parameter instructions', () => {
    it('should produce array values for a parameter', () => {
        const plan: ProcessingPlan = {
            fields: [makeParameterInstruction()],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 'Channel Partners', 'Amarilla'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual([
            'CA',
            'Channel Partners',
            'Amarilla'
        ]);
    });

    it('should assign __names companion using the same reference', () => {
        const namesArray = ['Country Code', 'Segment', 'Product'];
        const plan: ProcessingPlan = {
            fields: [makeParameterInstruction({ namesArray })],
            emitSelected: false,
            hasHighlights: false
        };
        const row1 = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 'X', 'Y'],
            rowIndex: 0,
            locale: 'en-US'
        });
        const row2 = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['DE', 'X', 'Y'],
            rowIndex: 1,
            locale: 'en-US'
        });
        // toBe checks reference equality
        expect(row1['Dynamic Category__names']).toBe(namesArray);
        expect(row2['Dynamic Category__names']).toBe(namesArray);
    });

    it('should emit format array from pre-built formatStringsArray', () => {
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    emitFormat: true,
                    formatStringsArray: ['$#,0', '#,0', '']
                })
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: [100, 200, 'hello'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category__format']).toEqual(['$#,0', '#,0', '']);
    });

    it('should emit formatted array via provider', () => {
        const formatProvider: SupportFieldValueProvider = {
            getFormatString: (fi) => ['$#,0', '#,0', ''][fi] ?? '',
            getFormattedValue: (value, fmt) => `${fmt}:${value}`,
            getHighlightValue: (_fi, _ri, base) => base
        };
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    emitFormatted: true,
                    formatStringsArray: ['$#,0', '#,0', '']
                })
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: formatProvider,
            baseValues: [100, 200, 'hello'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category__formatted']).toEqual([
            '$#,0:100',
            '#,0:200',
            ':hello'
        ]);
    });

    it('should handle single-element parameter (treat-as mode)', () => {
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    componentIndices: [0],
                    namesArray: ['Country Code']
                })
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual(['CA']);
        expect(row['Dynamic Category__names']).toEqual(['Country Code']);
    });

    it('should coexist with regular field instructions', () => {
        // The plan has two instructions: a parameter at plan position 0 and a
        // field at plan position 1. baseValues is ordered by plan position, so
        // the field instruction (i=1) reads baseValues[1]. The parameter reads
        // componentIndices to pick its individual values from baseValues.
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    componentIndices: [0],
                    namesArray: ['Country Code']
                }),
                {
                    kind: 'field',
                    encodedName: '$ Sales',
                    sourceIndex: 1,
                    baseValueIndex: 1,
                    role: 'aggregation',
                    emitHighlight: false,
                    emitHighlightStatus: false,
                    emitHighlightComparator: false,
                    emitFormat: false,
                    emitFormatted: false
                } satisfies FieldProcessingInstruction
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 2552747],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual(['CA']);
        expect(row['$ Sales']).toBe(2552747);
    });
});
