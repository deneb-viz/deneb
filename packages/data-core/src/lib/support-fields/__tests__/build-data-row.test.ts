import { describe, expect, it, vi } from 'vitest';
import { buildDataRow } from '../build-data-row';
import type {
    FieldProcessingInstruction,
    ProcessingPlan,
    SupportFieldValueProvider
} from '../types';
import {
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '../../field/constants';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const makeProvider = (
    overrides: Partial<SupportFieldValueProvider> = {}
): SupportFieldValueProvider => ({
    getFormatString: vi.fn().mockReturnValue('#,##0'),
    getFormattedValue: vi.fn().mockReturnValue('formatted-value'),
    getHighlightValue: vi.fn().mockReturnValue(50),
    ...overrides
});

const makeInstruction = (
    overrides: Partial<FieldProcessingInstruction> = {}
): FieldProcessingInstruction => ({
    encodedName: 'Sales',
    sourceIndex: 0,
    role: 'aggregation',
    emitHighlight: false,
    emitHighlightStatus: false,
    emitHighlightComparator: false,
    emitFormat: false,
    emitFormatted: false,
    ...overrides
});

const makePlan = (
    fields: FieldProcessingInstruction[],
    overrides: Partial<Omit<ProcessingPlan, 'fields'>> = {}
): ProcessingPlan => ({
    fields,
    emitSelected: false,
    hasHighlights: false,
    ...overrides
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildDataRow', () => {
    describe('row index', () => {
        it('should always set __row__ with the correct rowIndex', () => {
            const provider = makeProvider();
            const plan = makePlan([]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [],
                rowIndex: 7,
                locale: 'en-US'
            });
            expect(result[ROW_INDEX_FIELD_NAME]).toBe(7);
        });
    });

    describe('selection status', () => {
        it('should set __selected__ when plan.emitSelected is true and selectionStatus is provided', () => {
            const provider = makeProvider();
            const plan = makePlan([], { emitSelected: true });
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [],
                rowIndex: 0,
                selectionStatus: 'on',
                locale: 'en-US'
            });
            expect(result[SELECTED_ROW_FIELD_NAME]).toBe('on');
        });

        it('should NOT set __selected__ when plan.emitSelected is false', () => {
            const provider = makeProvider();
            const plan = makePlan([], { emitSelected: false });
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [],
                rowIndex: 0,
                selectionStatus: 'on',
                locale: 'en-US'
            });
            expect(result[SELECTED_ROW_FIELD_NAME]).toBeUndefined();
        });
    });

    describe('base value', () => {
        it('should always emit the base value for each field', () => {
            const provider = makeProvider();
            const plan = makePlan([makeInstruction({ encodedName: 'Sales' })]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(result['Sales']).toBe(100);
        });
    });

    describe('highlight value', () => {
        it('should emit highlight value when emitHighlight is true', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75)
            });
            const plan = makePlan([
                makeInstruction({ encodedName: 'Sales', emitHighlight: true })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 2,
                locale: 'en-US'
            });
            expect(result[`Sales${HIGHLIGHT_FIELD_SUFFIX}`]).toBe(75);
            expect(provider.getHighlightValue).toHaveBeenCalledWith(0, 2, 100);
        });

        it('should NOT emit highlight value when emitHighlight is false even if other highlight flags are on', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75)
            });
            const plan = makePlan(
                [
                    makeInstruction({
                        encodedName: 'Sales',
                        emitHighlight: false,
                        emitHighlightStatus: true,
                        emitHighlightComparator: true
                    })
                ],
                { hasHighlights: true }
            );
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(result[`Sales${HIGHLIGHT_FIELD_SUFFIX}`]).toBeUndefined();
        });
    });

    describe('highlight status', () => {
        it('should derive highlight status correctly using getHighlightStatusValue', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75)
            });
            const plan = makePlan(
                [
                    makeInstruction({
                        encodedName: 'Sales',
                        emitHighlightStatus: true
                    })
                ],
                { hasHighlights: true }
            );
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            // getHighlightStatusValue(true, 100, 75) → 'on' (hasHighlights=true, not null case)
            expect(result[`Sales${HIGHLIGHT_STATUS_SUFFIX}`]).toBe('on');
        });

        it('should resolve highlight value internally even when emitHighlight is false', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75)
            });
            const plan = makePlan(
                [
                    makeInstruction({
                        encodedName: 'Sales',
                        emitHighlight: false,
                        emitHighlightStatus: true
                    })
                ],
                { hasHighlights: true }
            );
            buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 3,
                locale: 'en-US'
            });
            expect(provider.getHighlightValue).toHaveBeenCalledWith(0, 3, 100);
        });
    });

    describe('highlight comparator', () => {
        it('should derive highlight comparator correctly using getHighlightComparatorValue', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75)
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitHighlightComparator: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            // getHighlightComparatorValue(100, 75) → 'lt' (75 < 100)
            expect(result[`Sales${HIGHLIGHT_COMPARATOR_SUFFIX}`]).toBe('lt');
        });

        it('should resolve highlight value internally even when emitHighlight is false', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(50)
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitHighlight: false,
                    emitHighlightComparator: true
                })
            ]);
            buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 5,
                locale: 'en-US'
            });
            expect(provider.getHighlightValue).toHaveBeenCalledWith(0, 5, 100);
        });
    });

    describe('format string', () => {
        it('should emit format string only when emitFormat is true', () => {
            const provider = makeProvider({
                getFormatString: vi.fn().mockReturnValue('#,##0.00')
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitFormat: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 1,
                locale: 'en-US'
            });
            expect(result[`Sales${FORMAT_FIELD_SUFFIX}`]).toBe('#,##0.00');
            expect(provider.getFormatString).toHaveBeenCalledWith(0, 1);
        });
    });

    describe('formatted value', () => {
        it('should emit formatted value only when emitFormatted is true', () => {
            const provider = makeProvider({
                getFormatString: vi.fn().mockReturnValue('#,##0'),
                getFormattedValue: vi.fn().mockReturnValue('100')
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitFormatted: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(result[`Sales${FORMATTED_FIELD_SUFFIX}`]).toBe('100');
            expect(provider.getFormattedValue).toHaveBeenCalledWith(
                100,
                '#,##0',
                'en-US'
            );
        });

        it('should resolve format string even when emitFormat is false but not write it to the row', () => {
            const provider = makeProvider({
                getFormatString: vi.fn().mockReturnValue('$#,##0'),
                getFormattedValue: vi.fn().mockReturnValue('$100')
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitFormat: false,
                    emitFormatted: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(result[`Sales${FORMATTED_FIELD_SUFFIX}`]).toBe('$100');
            expect(result[`Sales${FORMAT_FIELD_SUFFIX}`]).toBeUndefined();
            expect(provider.getFormatString).toHaveBeenCalledWith(0, 0);
            expect(provider.getFormattedValue).toHaveBeenCalledWith(
                100,
                '$#,##0',
                'en-US'
            );
        });

        it('should reuse format string from emitFormat when both are true', () => {
            const getFormatString = vi.fn().mockReturnValue('#,##0');
            const provider = makeProvider({
                getFormatString,
                getFormattedValue: vi.fn().mockReturnValue('100')
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    emitFormat: true,
                    emitFormatted: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(result[`Sales${FORMAT_FIELD_SUFFIX}`]).toBe('#,##0');
            expect(result[`Sales${FORMATTED_FIELD_SUFFIX}`]).toBe('100');
            // getFormatString should only be called once (reused)
            expect(getFormatString).toHaveBeenCalledTimes(1);
        });
    });

    describe('all flags off', () => {
        it('should only emit base value and __row__', () => {
            const provider = makeProvider();
            const plan = makePlan([makeInstruction({ encodedName: 'Sales' })]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                locale: 'en-US'
            });
            expect(Object.keys(result).sort()).toEqual(
                [ROW_INDEX_FIELD_NAME, 'Sales'].sort()
            );
            expect(result['Sales']).toBe(100);
            expect(result[ROW_INDEX_FIELD_NAME]).toBe(0);
        });
    });

    describe('all flags on', () => {
        it('should emit all support fields', () => {
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(75),
                getFormatString: vi.fn().mockReturnValue('#,##0'),
                getFormattedValue: vi.fn().mockReturnValue('100')
            });
            const plan = makePlan(
                [
                    makeInstruction({
                        encodedName: 'Sales',
                        emitHighlight: true,
                        emitHighlightStatus: true,
                        emitHighlightComparator: true,
                        emitFormat: true,
                        emitFormatted: true
                    })
                ],
                { emitSelected: true, hasHighlights: true }
            );
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [100],
                rowIndex: 0,
                selectionStatus: 'neutral',
                locale: 'en-US'
            });
            expect(result['Sales']).toBe(100);
            expect(result[`Sales${HIGHLIGHT_FIELD_SUFFIX}`]).toBe(75);
            expect(result[`Sales${HIGHLIGHT_STATUS_SUFFIX}`]).toBeDefined();
            expect(result[`Sales${HIGHLIGHT_COMPARATOR_SUFFIX}`]).toBeDefined();
            expect(result[`Sales${FORMAT_FIELD_SUFFIX}`]).toBe('#,##0');
            expect(result[`Sales${FORMATTED_FIELD_SUFFIX}`]).toBe('100');
            expect(result[ROW_INDEX_FIELD_NAME]).toBe(0);
            expect(result[SELECTED_ROW_FIELD_NAME]).toBe('neutral');
        });
    });

    describe('multiple fields', () => {
        it('should process each instruction independently', () => {
            const provider = makeProvider({
                getHighlightValue: vi
                    .fn()
                    .mockImplementation(
                        (
                            _fieldIndex: number,
                            _rowIndex: number,
                            baseValue: number
                        ) => baseValue * 0.5
                    ),
                getFormatString: vi.fn().mockReturnValue('0.00'),
                getFormattedValue: vi
                    .fn()
                    .mockImplementation((value: number) => `${value}`)
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Sales',
                    sourceIndex: 0,
                    emitHighlight: true,
                    emitFormat: false,
                    emitFormatted: false
                }),
                makeInstruction({
                    encodedName: 'Category',
                    sourceIndex: 1,
                    role: 'grouping',
                    emitHighlight: false,
                    emitFormat: true,
                    emitFormatted: true
                })
            ]);
            const result = buildDataRow({
                plan,
                provider,
                baseValues: [200, 'Electronics'],
                rowIndex: 4,
                locale: 'de-DE'
            });
            // Sales: base + highlight
            expect(result['Sales']).toBe(200);
            expect(result[`Sales${HIGHLIGHT_FIELD_SUFFIX}`]).toBe(100);
            expect(result[`Sales${FORMAT_FIELD_SUFFIX}`]).toBeUndefined();
            expect(result[`Sales${FORMATTED_FIELD_SUFFIX}`]).toBeUndefined();
            // Category: base + format + formatted
            expect(result['Category']).toBe('Electronics');
            expect(result[`Category${HIGHLIGHT_FIELD_SUFFIX}`]).toBeUndefined();
            expect(result[`Category${FORMAT_FIELD_SUFFIX}`]).toBe('0.00');
            expect(result[`Category${FORMATTED_FIELD_SUFFIX}`]).toBe(
                'Electronics'
            );
            // Provider calls correct sourceIndex
            expect(provider.getHighlightValue).toHaveBeenCalledWith(0, 4, 200);
            expect(provider.getFormatString).toHaveBeenCalledWith(1, 4);
            expect(provider.getFormattedValue).toHaveBeenCalledWith(
                'Electronics',
                '0.00',
                'de-DE'
            );
            // Row index always present
            expect(result[ROW_INDEX_FIELD_NAME]).toBe(4);
        });

        it('should pass plan field index (not sourceIndex) to provider methods', () => {
            // Both fields have sourceIndex=0 in their respective DataView arrays
            // (category at dvCategories[0], measure at dvValues[0]), but plan
            // positions are 0 and 1. The provider must receive i=0 and i=1, not
            // sourceIndex=0 for both.
            const provider = makeProvider({
                getHighlightValue: vi.fn().mockReturnValue(50),
                getFormatString: vi.fn().mockReturnValue('fmt')
            });
            const plan = makePlan([
                makeInstruction({
                    encodedName: 'Category',
                    sourceIndex: 0,
                    role: 'grouping',
                    emitFormat: true
                }),
                makeInstruction({
                    encodedName: 'Sales',
                    sourceIndex: 0,
                    role: 'aggregation',
                    emitHighlight: true
                })
            ]);
            buildDataRow({
                plan,
                provider,
                baseValues: ['A', 100],
                rowIndex: 0,
                locale: 'en-US'
            });
            // Category is plan field 0 → provider receives fieldIndex=0
            expect(provider.getFormatString).toHaveBeenCalledWith(0, 0);
            // Sales is plan field 1 → provider receives fieldIndex=1 (NOT sourceIndex=0)
            expect(provider.getHighlightValue).toHaveBeenCalledWith(1, 0, 100);
        });
    });
});
