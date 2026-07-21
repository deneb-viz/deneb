import type { DatasetFields, DatasetFieldsInput } from '../field/types';
import type { VegaDatum } from '../value/types';

/**
 * Internal dataset type - always has normalized DatasetFields.
 */
export type TabularDataset = {
    fields: DatasetFields;
    values: VegaDatum[];
};

/**
 * Input dataset type - accepts flexible field formats.
 * Arrays are normalized to records internally.
 *
 * @example
 * // Simple format
 * { fields: ['a', 'b'], values: [...] }
 *
 * @example
 * // Full format
 * { fields: { a: { role: 'grouping' } }, values: [...] }
 */
export type TabularDatasetInput = {
    fields: DatasetFieldsInput;
    values: VegaDatum[];
};
