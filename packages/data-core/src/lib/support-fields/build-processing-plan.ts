import type { DatasetFieldRole } from '../field/types';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings,
    FieldProcessingInstruction,
    ProcessingPlan
} from './types';
import { resolveFieldDefaults } from './resolve-defaults';

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
};

/**
 * Build a ProcessingPlan from the field list, sparse configuration and master
 * settings. All flag resolution happens here — once — before the row loop.
 *
 * For each field:
 * - If an explicit entry exists in `configuration`, its flags are used directly.
 * - Otherwise, `resolveFieldDefaults()` derives the flags from the field role,
 *   master settings and legacy flag.
 *
 * Pure function — no side effects, fully testable.
 */
export const buildProcessingPlan = (
    params: BuildProcessingPlanParams
): ProcessingPlan => {
    const { fields, configuration, masterSettings, hasHighlights, isLegacy } =
        params;

    const instructions: FieldProcessingInstruction[] = fields.map((field) => {
        const explicit = configuration[field.encodedName];

        const flags =
            explicit !== undefined
                ? explicit
                : resolveFieldDefaults({
                      masterSettings,
                      fieldRole: field.role,
                      isLegacy
                  });

        return {
            encodedName: field.encodedName,
            sourceIndex: field.sourceIndex,
            role: field.role,
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        };
    });

    return {
        fields: instructions,
        emitSelected: masterSettings.crossFilterEnabled,
        hasHighlights
    };
};
