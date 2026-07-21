import type { SupportFieldValueProvider } from './types';

/**
 * Create a default (passthrough) support field value provider.
 * Suitable for platforms that don't support highlights or formatting,
 * or as a base for partial overrides.
 *
 * Behavior:
 * - Format strings: '' (empty)
 * - Formatted values: base value as-is
 * - Highlight values: base value (equal to source, effectively 'eq')
 */
export const createDefaultProvider = (): SupportFieldValueProvider => ({
    getFormatString: () => '',
    getFormattedValue: (value) => value,
    getHighlightValue: (_fieldIndex, _rowIndex, baseValue) => baseValue
});
