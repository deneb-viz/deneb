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
    formatted: 'Text_SupportField_Formatted'
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
    formatted: 'Assistive_Text_SupportField_Formatted'
};

/** Separator used to encode field name + flag key in TreeItem values. */
export const VALUE_SEPARATOR = '::';

/** Encode a TreeItem value from field name and flag key. */
export const encodeValue = (fieldName: string, flag: string): string =>
    `${fieldName}${VALUE_SEPARATOR}${flag}`;

/** Decode a TreeItem value into [fieldName, flagKey]. */
export const decodeValue = (value: string): [string, string] => {
    const idx = value.lastIndexOf(VALUE_SEPARATOR);
    return [value.slice(0, idx), value.slice(idx + VALUE_SEPARATOR.length)];
};
