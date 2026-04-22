import {
    type SupportFieldConfiguration,
    type SupportFieldFlags
} from '@deneb-viz/data-core/support-fields';

/**
 * The support field flag keys applicable to measures (all flags).
 */
export const MEASURE_FLAGS = [
    'highlight',
    'highlightStatus',
    'highlightComparator',
    'format',
    'formatted'
] as const;

/**
 * The support field flag keys applicable to columns (format only).
 */
export const COLUMN_FLAGS = ['format', 'formatted'] as const;

/**
 * Mapping from flag key to i18n key for the toggle label.
 */
export const FLAG_LABELS: Record<string, string> = {
    highlight: 'Text_SupportField_Highlight',
    highlightStatus: 'Text_SupportField_HighlightStatus',
    highlightComparator: 'Text_SupportField_HighlightComparator',
    format: 'Text_SupportField_Format',
    formatted: 'Text_SupportField_Formatted',
    names: 'Text_SupportField_Names',
    treatAsParameter: 'Text_SupportField_TreatAsParameter'
};

/**
 * Mapping from flag key to i18n key for the assistive info text.
 * Only flags with info text are included.
 */
export const FLAG_INFO: Partial<Record<string, string>> = {
    highlight: 'Assistive_Text_SupportField_Highlight',
    highlightStatus: 'Assistive_Text_SupportField_HighlightStatus',
    highlightComparator: 'Assistive_Text_SupportField_HighlightComparator',
    format: 'Assistive_Text_SupportField_Format',
    formatted: 'Assistive_Text_SupportField_Formatted',
    names: 'Assistive_Text_SupportField_Names',
    treatAsParameter: 'Assistive_Text_SupportField_TreatAsParameter'
};

/**
 * Compute which flags are applicable for a field based on its role,
 * parameter state, and whether consolidation is enabled.
 */
export const getApplicableFlags = (
    baseFlags: readonly string[],
    isFieldParameter: boolean,
    isTreatedAs: boolean,
    isParameter: boolean,
    consolidateFieldParameters: boolean
): (keyof SupportFieldFlags)[] => {
    const flags: (keyof SupportFieldFlags)[] = [
        ...baseFlags
    ] as (keyof SupportFieldFlags)[];
    if (consolidateFieldParameters) {
        if (!isFieldParameter || isTreatedAs) {
            flags.push('treatAsParameter');
        }
        if (isParameter) {
            flags.push('names');
        }
    }
    return flags;
};

/**
 * Compute the next `SupportFieldConfiguration` after toggling a single flag.
 *
 * Returns `null` when the field has no entry in `resolvedFlags` — this is the
 * stale-render guard for the rare case where a checkbox onChange fires after
 * the field has been removed from `sourceFields`.
 */
export const computeToggledConfig = (
    config: SupportFieldConfiguration,
    resolvedFlags: Record<string, SupportFieldFlags>,
    fieldName: string,
    flag: keyof SupportFieldFlags,
    checked: boolean
): SupportFieldConfiguration | null => {
    const currentFlags = resolvedFlags[fieldName];
    if (!currentFlags) return null;
    return {
        ...config,
        [fieldName]: { ...currentFlags, [flag]: checked }
    };
};

/**
 * True when any of `applicableFlags` is currently enabled in `flags`.
 *
 * Drives the "this field will produce support fields" hint on the field
 * header row. Intentionally decoupled from `name in config` (which drives
 * the Reset button) — a field whose resolved defaults produce support
 * fields shows the hint even without an explicit config record.
 */
export const hasAnyEnabledFlag = (
    flags: SupportFieldFlags | undefined,
    applicableFlags: readonly (keyof SupportFieldFlags)[]
): boolean => {
    if (!flags) return false;
    return applicableFlags.some((flag) => flags[flag] === true);
};

/**
 * Return `config` without the named field's entry.
 */
export const removeFieldFromConfig = (
    config: SupportFieldConfiguration,
    fieldName: string
): SupportFieldConfiguration => {
    const next: SupportFieldConfiguration = { ...config };
    delete next[fieldName];
    return next;
};
