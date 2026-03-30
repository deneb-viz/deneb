import type { SupportFieldFlags, SupportFieldMasterSettings } from './types';
import type { DatasetFieldRole } from '../field/types';

export type ResolveFieldDefaultsParams = {
    masterSettings: SupportFieldMasterSettings;
    fieldRole: DatasetFieldRole;
    isLegacy: boolean;
};

/**
 * Resolve default support field flags for a field that has no explicit
 * configuration. Pure function — no side effects, fully testable.
 *
 * New specs: highlight on for measures (if cross-highlight enabled),
 * everything else off.
 *
 * Legacy specs: everything on that master settings allow, matching
 * pre-2.0 behavior exactly.
 */
export const resolveFieldDefaults = ({
    masterSettings,
    fieldRole,
    isLegacy
}: ResolveFieldDefaultsParams): SupportFieldFlags => {
    const isMeasure = fieldRole === 'aggregation';
    const highlightApplicable =
        isMeasure && masterSettings.crossHighlightEnabled;

    if (isLegacy) {
        return {
            highlight: highlightApplicable,
            highlightStatus: highlightApplicable,
            highlightComparator: highlightApplicable,
            format: isMeasure,
            formatted: isMeasure
        };
    }

    return {
        highlight: highlightApplicable,
        highlightStatus: false,
        highlightComparator: false,
        format: false,
        formatted: false
    };
};
