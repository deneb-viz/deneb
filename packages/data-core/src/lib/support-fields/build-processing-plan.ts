import type { DatasetFieldRole } from '../field/types';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings,
    FieldProcessingInstruction,
    ParameterProcessingInstruction,
    ProcessingInstruction,
    ProcessingPlan
} from './types';
import { resolveFieldDefaults } from './resolve-defaults';

/**
 * Pre-grouped field parameter information, built by the platform-specific
 * detection layer before plan building.
 */
export type PlanParameterGroup = {
    parameterName: string;
    /** Indices into the `fields` array for each component field. */
    componentFieldIndices: number[];
    /** Display names of the component fields, in DataView order. */
    componentNames: string[];
    /** Role of each component field — determines highlight behavior per-element. */
    componentRoles: ('grouping' | 'aggregation')[];
    /**
     * Pre-resolved format strings for component fields (row-invariant).
     * undefined if format emission is not applicable.
     */
    formatStrings?: string[];
};

export type BuildProcessingPlanParams = {
    fields: Array<{
        encodedName: string;
        sourceIndex: number;
        role: DatasetFieldRole;
    }>;
    configuration: SupportFieldConfiguration;
    masterSettings: SupportFieldMasterSettings;
    hasHighlights: boolean;
    isLegacy: boolean;
    /**
     * Field parameter groups detected by the platform.
     * When provided, component fields are merged into parameter instructions
     * instead of individual field instructions.
     */
    parameterGroups?: PlanParameterGroup[];
};

/**
 * Build a ProcessingPlan from the field list, sparse configuration, master
 * settings, and optional parameter groups. All flag resolution happens here
 * — once — before the row loop.
 *
 * For each field:
 * - If the field belongs to a parameter group, it is merged into a
 *   ParameterProcessingInstruction for that group.
 * - Otherwise, if an explicit entry exists in `configuration`, its flags
 *   are used directly.
 * - Otherwise, `resolveFieldDefaults()` derives the flags from the field
 *   role, master settings and legacy flag.
 *
 * Pure function — no side effects, fully testable.
 */
export const buildProcessingPlan = (
    params: BuildProcessingPlanParams
): ProcessingPlan => {
    const {
        fields,
        configuration,
        masterSettings,
        hasHighlights,
        isLegacy,
        parameterGroups = []
    } = params;

    // Build a set of field indices consumed by parameter groups so they
    // are excluded from the regular field instruction loop.
    const parameterFieldIndices = new Set<number>();
    for (const group of parameterGroups) {
        for (const idx of group.componentFieldIndices) {
            parameterFieldIndices.add(idx);
        }
    }

    const instructions: ProcessingInstruction[] = [];

    // Emit parameter instructions for each group (in group order)
    for (const group of parameterGroups) {
        // Encode the parameter name using the same rules as field names
        const encodedName =
            group.parameterName.replace(/([\\".[\]])/g, '_') || '';

        const explicit = configuration[encodedName];
        const flags =
            explicit !== undefined
                ? explicit
                : resolveFieldDefaults({
                      masterSettings,
                      fieldRole: 'field-parameter',
                      isLegacy
                  });

        const instruction: ParameterProcessingInstruction = {
            kind: 'parameter',
            encodedName,
            componentIndices: group.componentFieldIndices,
            componentRoles: group.componentRoles,
            namesArray: group.componentNames,
            formatStringsArray: flags.format ? group.formatStrings : undefined,
            // Default false: __names is opt-in. Configs saved before the names flag was introduced have no names property.
            emitNames: flags.names ?? false,
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        };

        instructions.push(instruction);
    }

    // Emit regular field instructions for non-parameter fields
    for (let i = 0; i < fields.length; i++) {
        if (parameterFieldIndices.has(i)) continue;

        const field = fields[i];
        if (!field) continue;
        const explicit = configuration[field.encodedName];

        const flags =
            explicit !== undefined
                ? explicit
                : resolveFieldDefaults({
                      masterSettings,
                      fieldRole: field.role,
                      isLegacy
                  });

        // Field-parameter fields should be consumed by parameter groups;
        // skip any that leak through (defensive guard).
        if (field.role === 'field-parameter') continue;

        const instruction: FieldProcessingInstruction = {
            kind: 'field',
            encodedName: field.encodedName,
            sourceIndex: field.sourceIndex,
            baseValueIndex: i,
            role: field.role,
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        };

        instructions.push(instruction);
    }

    return {
        fields: instructions,
        emitSelected: masterSettings.crossFilterEnabled,
        hasHighlights
    };
};
