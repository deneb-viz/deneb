/**
 * Shared fixture helpers for `__bench__/*.bench.ts` files.
 *
 * IMPORTANT: use only pure closures for providers — do NOT use `vi.fn()`.
 * Mock-tracking adds measurable overhead that distorts the `hz` numbers
 * this suite exists to protect.
 *
 * Data-generation helpers are intended to be called ONCE per bench file
 * (at module scope), not per-iteration. Per-iteration allocation introduces
 * measurement noise that swamps the signal from regressions in the
 * functions under test.
 */
import type {
    FieldProcessingInstruction,
    ParameterProcessingInstruction,
    ProcessingInstruction,
    ProcessingPlan,
    SupportFieldValueProvider
} from '../types';
import type { PrimitiveValue } from '../value/types';

/**
 * Returns a provider where every call is a passthrough (no real work).
 * Measures plan-execution overhead only — not realistic of Power BI host cost.
 */
export const makePassthroughProvider = (): SupportFieldValueProvider => ({
    getFormatString: () => '',
    getFormattedValue: (value) => value,
    getHighlightValue: (_fieldIndex, _rowIndex, baseValue) => baseValue
});

/**
 * Returns a provider that performs simple non-trivial work (arithmetic +
 * string concat), approximating the cost of real formatting/highlight logic
 * without coupling to the Power BI host.
 */
export const makeRealisticProvider = (): SupportFieldValueProvider => ({
    getFormatString: (fieldIndex) => (fieldIndex % 2 === 0 ? '' : '#,0.00'),
    getFormattedValue: (value, formatString) =>
        formatString === ''
            ? String(value)
            : String(value) + ' ' + formatString,
    getHighlightValue: (_fieldIndex, _rowIndex, baseValue) => {
        if (typeof baseValue === 'number') {
            return baseValue > 100
                ? baseValue
                : (null as unknown as PrimitiveValue);
        }
        return baseValue;
    }
});

/**
 * Builds a single field instruction with sensible defaults — one aggregation
 * measure with highlight + format emission enabled, the rest grouping.
 */
const makeFieldInstruction = (
    index: number,
    total: number
): FieldProcessingInstruction => {
    const isMeasure = index === total - 1;
    return {
        kind: 'field',
        encodedName: isMeasure ? `Measure_${index}` : `Category_${index}`,
        sourceIndex: index,
        baseValueIndex: index,
        role: isMeasure ? 'aggregation' : 'grouping',
        emitHighlight: isMeasure,
        emitHighlightStatus: isMeasure,
        emitHighlightComparator: false,
        emitFormat: isMeasure,
        emitFormatted: isMeasure
    };
};

/**
 * Builds a `ProcessingPlan` containing only `field` instructions. Last field
 * is an aggregation measure (highlight + format enabled); all others are
 * grouping categories (passthrough).
 *
 * Total base value slots = `fieldCount`.
 */
export const makeFieldOnlyPlan = (fieldCount: number): ProcessingPlan => {
    const fields: ProcessingInstruction[] = [];
    for (let i = 0; i < fieldCount; i++) {
        fields.push(makeFieldInstruction(i, fieldCount));
    }
    return {
        fields,
        emitSelected: false,
        hasHighlights: true
    };
};

/**
 * Builds a `ProcessingPlan` mixing `field` and `parameter` instructions.
 * Half the output slots are regular fields; half are parameter groups of
 * 3 components each. Exercises the allocation-heavy `.map()` branch of
 * `buildDataRow`.
 *
 * Total base value slots = `fieldCount` + (groupCount * 3).
 */
export const makeParameterHeavyPlan = (
    fieldCount: number,
    componentsPerGroup = 3
): ProcessingPlan => {
    const fields: ProcessingInstruction[] = [];
    const fieldInstructionCount = Math.ceil(fieldCount / 2);
    const groupCount = Math.floor(fieldCount / 2);

    for (let i = 0; i < fieldInstructionCount; i++) {
        fields.push(makeFieldInstruction(i, fieldInstructionCount));
    }

    let baseValueCursor = fieldInstructionCount;
    for (let g = 0; g < groupCount; g++) {
        const componentIndices: number[] = [];
        const componentRoles: ('grouping' | 'aggregation')[] = [];
        const namesArray: string[] = [];
        for (let c = 0; c < componentsPerGroup; c++) {
            componentIndices.push(baseValueCursor + c);
            componentRoles.push(
                c === componentsPerGroup - 1 ? 'aggregation' : 'grouping'
            );
            namesArray.push(`Component_${g}_${c}`);
        }
        baseValueCursor += componentsPerGroup;

        const instruction: ParameterProcessingInstruction = {
            kind: 'parameter',
            encodedName: `Parameter_${g}`,
            componentIndices,
            componentRoles,
            namesArray,
            formatStringsArray: new Array(componentsPerGroup).fill('#,0.00'),
            emitNames: true,
            emitHighlight: true,
            emitHighlightStatus: true,
            emitHighlightComparator: false,
            emitFormat: true,
            emitFormatted: true
        };
        fields.push(instruction);
    }

    return {
        fields,
        emitSelected: false,
        hasHighlights: true
    };
};

/**
 * Pre-allocates a 2D array `[rowCount][slotCount]` of base values. Each row's
 * inner array is passed as `baseValues` to `buildDataRow` for that row.
 *
 * Generated once at module scope — never inside the bench iteration body.
 */
export const generateBaseValues = (
    rowCount: number,
    slotCount: number
): PrimitiveValue[][] => {
    const rows: PrimitiveValue[][] = new Array(rowCount);
    for (let r = 0; r < rowCount; r++) {
        const row: PrimitiveValue[] = new Array(slotCount);
        for (let i = 0; i < slotCount; i++) {
            // Alternate strings and numbers so both code paths in the
            // realistic provider get exercised.
            row[i] = i % 2 === 0 ? `cat_${r}_${i}` : r * 100 + i;
        }
        rows[r] = row;
    }
    return rows;
};

/**
 * Returns the total number of base value slots a plan needs.
 */
export const slotCountForPlan = (plan: ProcessingPlan): number => {
    let max = 0;
    for (const instruction of plan.fields) {
        if (instruction.kind === 'field') {
            if (instruction.baseValueIndex + 1 > max) {
                max = instruction.baseValueIndex + 1;
            }
        } else {
            for (const idx of instruction.componentIndices) {
                if (idx + 1 > max) max = idx + 1;
            }
        }
    }
    return max;
};
