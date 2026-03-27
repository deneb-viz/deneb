import type { PrimitiveValue } from '../value/types';

/**
 * Per-field flags controlling which support fields are generated.
 * When all flags for a field are written (user has configured), the
 * entry is present in the sparse configuration. Absent entries fall
 * through to defaults.
 */
export type SupportFieldFlags = {
    highlight: boolean;
    highlightStatus: boolean;
    highlightComparator: boolean;
    format: boolean;
    formatted: boolean;
};

/**
 * Sparse configuration: keyed by encoded field name.
 * Only fields explicitly configured by the user are present.
 */
export type SupportFieldConfiguration = Record<string, SupportFieldFlags>;

/**
 * Master settings that influence default flag resolution.
 */
export type SupportFieldMasterSettings = {
    crossHighlightEnabled: boolean;
    crossFilterEnabled: boolean;
};

/**
 * Platform-injected handlers for resolving support field values.
 * The engine always produces support fields when flags say so;
 * the platform determines the values.
 */
export type SupportFieldValueProvider = {
    /** Resolve format string for a field at a given row. Returns '' if unavailable. */
    getFormatString: (fieldIndex: number, rowIndex: number) => string;
    /** Produce a formatted display value from a raw value and format string. */
    getFormattedValue: (
        value: PrimitiveValue,
        formatString: string,
        locale: string
    ) => PrimitiveValue;
    /** Get the highlight value for a field at a given row. Returns base value if unavailable. */
    getHighlightValue: (
        fieldIndex: number,
        rowIndex: number,
        baseValue: PrimitiveValue
    ) => PrimitiveValue;
};

/**
 * Pre-computed instruction for a single field in the processing plan.
 * All flag resolution happens at plan-build time, not during the row loop.
 */
export type FieldProcessingInstruction = {
    encodedName: string;
    sourceIndex: number;
    role: 'grouping' | 'aggregation';
    emitHighlight: boolean;
    emitHighlightStatus: boolean;
    emitHighlightComparator: boolean;
    emitFormat: boolean;
    emitFormatted: boolean;
};

/**
 * Complete processing plan, built once before the row loop.
 */
export type ProcessingPlan = {
    fields: FieldProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
