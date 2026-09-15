import {
    resolveFieldDefaults,
    type SupportFieldConfiguration,
    type SupportFieldFlags,
    type SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import type { DatasetField } from '@deneb-viz/data-core/field';

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
 * Resolve the concrete flag set that drives a single source field's UI
 * row. Returns the caller's explicit config entry when present, else
 * falls back to role + master-settings defaults.
 *
 * Called by both the render path in `DatasetSettings` and the dataset
 * indexer used by settings-pane search. Kept here so the two consumers
 * cannot drift.
 */
export const resolveFieldFlagsForConfig = (
    field: DatasetField,
    config: SupportFieldConfiguration,
    name: string,
    masterSettings: SupportFieldMasterSettings,
    isLegacy: boolean
): SupportFieldFlags => {
    const explicit = config[name];
    if (explicit) return explicit;
    return resolveFieldDefaults({
        masterSettings,
        fieldRole: field.role ?? 'grouping',
        isLegacy
    });
};

/**
 * Role / parameter / applicability descriptor for a single source
 * field. `applicableFlags` is the list of flag keys that the UI row
 * will render; the four booleans capture the role classification the
 * component uses to drive its tooltip and icon.
 */
export type FieldApplicability = {
    isMeasure: boolean;
    isFieldParameter: boolean;
    isTreatedAs: boolean;
    isParameter: boolean;
    applicableFlags: (keyof SupportFieldFlags)[];
};

/**
 * Compute the applicability descriptor for a field. Encapsulates the
 * role / parameter / base-flag lookup that both the render path in
 * `DatasetSettings` and the search indexer need to agree on.
 *
 * Indexer consumers typically only read `applicableFlags`; the render
 * path additionally reads the role booleans to pick its icon, tooltip,
 * and heading. Returning the full set avoids either caller having to
 * recompute values the other already has.
 */
export const resolveFieldApplicability = (input: {
    field: DatasetField;
    fieldFlags: SupportFieldFlags;
    highlightEnabled: boolean;
    consolidateFieldParameters: boolean;
}): FieldApplicability => {
    const { field, fieldFlags, highlightEnabled, consolidateFieldParameters } =
        input;
    const isMeasure = (field.role ?? 'grouping') === 'aggregation';
    const isFieldParameter = field.role === 'field-parameter';
    const baseFlags =
        isMeasure || isFieldParameter
            ? highlightEnabled
                ? MEASURE_FLAGS
                : COLUMN_FLAGS
            : COLUMN_FLAGS;
    const isTreatedAs = fieldFlags.treatAsParameter === true;
    const isParameter = isFieldParameter || isTreatedAs;
    const applicableFlags = getApplicableFlags(
        baseFlags,
        isFieldParameter,
        isTreatedAs,
        isParameter,
        consolidateFieldParameters
    );
    return {
        isMeasure,
        isFieldParameter,
        isTreatedAs,
        isParameter,
        applicableFlags
    };
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
