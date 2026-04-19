import {
    isBoolean,
    isDate,
    isNumber,
    isObject,
    isString
} from '@deneb-viz/utils/inspection';

import type { WorkerDatasetViewerValueType } from './types';

/**
 * Classifies a raw value into one of the debug-area value types. Used by the
 * data-viewer web worker when processing dataset rows, and by the signal
 * viewer on the main thread so both surfaces agree on the type for
 * inspector sizing and formatting.
 *
 * The classification is intentionally narrow — it does not distinguish
 * sub-kinds of scalars beyond what affects presentation. Anything unrecognised
 * becomes `'invalid'` so that downstream consumers can apply a predictable
 * fallback (e.g., plaintext Monaco language).
 */
export const getValueType = (value: unknown): WorkerDatasetViewerValueType => {
    switch (true) {
        case isDate(value):
            return 'date';
        case isNumber(value):
            return 'number';
        case Array.isArray(value):
            return 'array';
        case isObject(value):
            return 'object';
        case isBoolean(value):
            return 'boolean';
        case isString(value):
            return 'string';
        default:
            return 'invalid';
    }
};
