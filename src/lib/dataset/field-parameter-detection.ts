import type powerbi from 'powerbi-visuals-api';

/**
 * Minimal field shape needed for parameter detection.
 * Avoids coupling to the full Power BI DataViewMetadataColumn type while
 * still using the SDK's own `DataViewSourceFieldParameterMetadata` shape
 * for the parameter list, so call sites do not need an `as`-cast.
 */
export type DetectableField = {
    displayName: string;
    sourceIndex: number;
    isMeasure: boolean;
    sourceFieldParameters?: powerbi.DataViewSourceFieldParameterMetadata[];
};

/**
 * A group of fields that belong to the same field parameter.
 */
export type FieldParameterGroup = {
    /** The display name of the field parameter. */
    parameterName: string;
    /** Display names of the component fields, in DataView order. */
    componentNames: string[];
    /** Indices into the original fields array for each component. */
    componentFieldIndices: number[];
    /** Role of each component field — determines highlight behavior per-element. */
    componentRoles: ('grouping' | 'aggregation')[];
    /** Whether the group contains both columns and measures. */
    hasMixedRoles: boolean;
};

/**
 * Result of field parameter detection.
 */
export type FieldParameterDetectionResult = {
    /** Groups keyed by parameter name. Insertion order matches first occurrence. */
    parameterGroups: Record<string, FieldParameterGroup>;
    /** Indices of fields that do NOT belong to any field parameter. */
    regularFieldIndices: number[];
};

/**
 * Detect field parameter groups from an array of detectable fields.
 * Each field is registered as a component of every parameter named in its
 * `sourceFieldParameters` array — a single source field can therefore appear
 * in multiple parameter groups, and the same `componentFieldIndices` value
 * can recur across groups. Fields with no `sourceFieldParameters` (or an
 * empty array) are classified as regular. Duplicate `displayName` entries
 * within one field's array are deduped so the field appears at most once
 * per group.
 *
 * Pure function — no side effects, fully testable.
 */
export const detectFieldParameterGroups = (
    fields: DetectableField[]
): FieldParameterDetectionResult => {
    const parameterGroups: Record<string, FieldParameterGroup> = {};
    const regularFieldIndices: number[] = [];

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const paramEntries = field.sourceFieldParameters ?? [];

        if (paramEntries.length === 0) {
            regularFieldIndices.push(i);
            continue;
        }

        // Dedup parameter names within this field's entries — defends
        // against the unlikely case where Power BI lists the same parameter
        // twice for one field, which would otherwise double-count the
        // field inside the corresponding group.
        const seenParamNames = new Set<string>();
        let registeredInAnyGroup = false;

        for (const entry of paramEntries) {
            const paramName = entry.displayName;
            if (!paramName || seenParamNames.has(paramName)) continue;
            seenParamNames.add(paramName);

            if (!parameterGroups[paramName]) {
                parameterGroups[paramName] = {
                    parameterName: paramName,
                    componentNames: [],
                    componentFieldIndices: [],
                    componentRoles: [],
                    hasMixedRoles: false
                };
            }

            const group = parameterGroups[paramName];
            group.componentNames.push(field.displayName);
            group.componentFieldIndices.push(i);
            group.componentRoles.push(
                field.isMeasure ? 'aggregation' : 'grouping'
            );

            // Check for mixed roles (columns + measures in same parameter)
            if (group.componentFieldIndices.length > 1) {
                const firstIsMeasure =
                    fields[group.componentFieldIndices[0]].isMeasure;
                if (field.isMeasure !== firstIsMeasure) {
                    group.hasMixedRoles = true;
                }
            }

            registeredInAnyGroup = true;
        }

        // Fall back to regular when every entry was missing a usable
        // displayName — preserves prior behavior for fields whose
        // `sourceFieldParameters` array contains only empty entries.
        if (!registeredInAnyGroup) {
            regularFieldIndices.push(i);
        }
    }

    return { parameterGroups, regularFieldIndices };
};
