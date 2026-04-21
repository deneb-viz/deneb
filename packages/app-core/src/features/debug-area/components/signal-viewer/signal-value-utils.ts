import { getPrunedObject, stringifyPruned } from '@deneb-viz/utils/object';

import {
    DATA_TABLE_VALUE_MAX_DEPTH,
    DATA_TABLE_VALUE_MAX_LENGTH
} from '../../constants';
import { getValueType } from '../../workers/get-value-type';
import type { WorkerDatasetViewerValueType } from '../../workers/types';

export interface SignalDisplay {
    raw: unknown;
    display: string;
    valueType: WorkerDatasetViewerValueType;
    tooLong: boolean;
}

/**
 * Translation-function shape used by `computeSignalDisplay`. Matches
 * `state.i18n.translate` but narrowed to the single key/no-args call site
 * this helper needs — keeps the helper pure and trivially mockable.
 */
export type SignalDisplayTranslator = (
    key: 'Table_Placeholder_TooLong'
) => string;

/**
 * Pure computation of the display payload for a signal's current value.
 * Takes the raw (unpruned) signal value plus a translator for the "too long"
 * placeholder, and returns:
 *
 * - `valueType` — derived from the unpruned value so value-type bookkeeping
 *   still sees objects/arrays past the pruning depth.
 * - `raw` — the depth-pruned value suitable for handing to the inspector.
 * - `display` — the string shown inline in the cell: the stringified pruned
 *   value, or the translated placeholder when it exceeds the inline budget.
 * - `tooLong` — whether the placeholder was substituted.
 *
 * `stringifyPruned` may return null for some inputs; we normalise to an
 * empty string before the length comparison so `tooLong` is always a real
 * boolean rather than silently evaluating `undefined > N` as false.
 */
export const computeSignalDisplay = (
    unpruned: unknown,
    translate: SignalDisplayTranslator
): SignalDisplay => {
    const valueType = getValueType(unpruned);
    // `getPrunedObject` is typed as `(json: object, …)`, but at runtime the
    // upstream pipeline also hands it primitives (numbers, strings, booleans)
    // via Vega signals. Mirror the original untyped call site's behaviour.
    const raw = getPrunedObject(unpruned as object, {
        maxDepth: DATA_TABLE_VALUE_MAX_DEPTH
    });
    const stringified = stringifyPruned(raw) ?? '';
    const tooLong = stringified.length > DATA_TABLE_VALUE_MAX_LENGTH;
    const display = tooLong
        ? translate('Table_Placeholder_TooLong')
        : stringified;
    return { raw, display, valueType, tooLong };
};

/**
 * Display payload returned for signals whose value cannot be read — Vega
 * view not yet initialised, signal out of scope, or accessor threw.
 */
export const INVALID_SIGNAL_DISPLAY: SignalDisplay = {
    raw: null,
    display: '',
    valueType: 'invalid',
    tooLong: false
};
