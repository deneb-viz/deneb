/**
 * Minimal field shape needed for parameter detection.
 * Avoids coupling to the full Power BI DataViewMetadataColumn type.
 */
export type DetectableField = {
    displayName: string;
    sourceIndex: number;
    isMeasure: boolean;
    sourceFieldParameters?: Array<{ displayName: string }>;
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
 * Fields are grouped by the first entry in their `sourceFieldParameters`
 * array. Fields without `sourceFieldParameters` are classified as regular.
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
        const paramName = field.sourceFieldParameters?.[0]?.displayName;

        if (!paramName) {
            regularFieldIndices.push(i);
            continue;
        }

        if (!parameterGroups[paramName]) {
            parameterGroups[paramName] = {
                parameterName: paramName,
                componentNames: [],
                componentFieldIndices: [],
                hasMixedRoles: false
            };
        }

        const group = parameterGroups[paramName];
        group.componentNames.push(field.displayName);
        group.componentFieldIndices.push(i);

        // Check for mixed roles (columns + measures in same parameter)
        if (group.componentFieldIndices.length > 1) {
            const firstIsMeasure =
                fields[group.componentFieldIndices[0]].isMeasure;
            if (field.isMeasure !== firstIsMeasure) {
                group.hasMixedRoles = true;
            }
        }
    }

    return { parameterGroups, regularFieldIndices };
};
