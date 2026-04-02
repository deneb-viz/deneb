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
    kind: 'field';
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
 * Pre-computed instruction for a consolidated field parameter.
 * Component fields are merged into array-valued columns at row execution time.
 */
export type ParameterProcessingInstruction = {
    kind: 'parameter';
    /** Encoded name of the field parameter (used as the column name). */
    encodedName: string;
    /**
     * Indices into the baseValues array for each component field.
     * Order matches the DataView order.
     */
    componentIndices: number[];
    /**
     * Pre-built array of component field display names (row-invariant).
     * The same reference is reused for every row.
     */
    namesArray: string[];
    /**
     * Pre-built array of format strings for component fields (row-invariant
     * for columns; measures may need per-row resolution via provider).
     * undefined when format emission is disabled.
     */
    formatStringsArray?: string[];
    /** Whether to emit the __format companion field. */
    emitFormat: boolean;
    /** Whether to emit the __formatted companion field. */
    emitFormatted: boolean;
};

/**
 * A single instruction in the processing plan — either a regular field
 * or a consolidated field parameter.
 */
export type ProcessingInstruction =
    | FieldProcessingInstruction
    | ParameterProcessingInstruction;

/**
 * Complete processing plan, built once before the row loop.
 */
export type ProcessingPlan = {
    fields: ProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
