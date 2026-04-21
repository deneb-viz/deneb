import { formatJson } from '@deneb-viz/utils/object';
import type { WorkerDatasetViewerValueType } from '../../workers/types';

/**
 * Attribute applied to every inspectable DataTableCell div. Lives in this
 * helper module so the cell renderer and the popover's close-path guards
 * reference the same source of truth.
 */
export const INSPECTABLE_CELL_ATTRIBUTE = 'data-inspector-cell';
const INSPECTABLE_CELL_SELECTOR = `[${INSPECTABLE_CELL_ATTRIBUTE}]`;

/**
 * Predicate used by the popover's close-path guards to decide whether a
 * dismiss-event target is one of our own inspectable cells — in which case
 * that cell's own onClick will retarget the popover and the dismiss must
 * not fire. Requires `isConnected` so a detached target (e.g. an already-
 * unmounted cell from a previous render) falls through to close.
 */
export const isDismissTargetInspectableCell = (
    target: EventTarget | null | undefined
): boolean =>
    target instanceof Element &&
    target.isConnected &&
    target.closest(INSPECTABLE_CELL_SELECTOR) !== null;

/**
 * Popover dimensions for values that should render in a compact container.
 * Single-line fit for scalar value types.
 */
export const INSPECTOR_COMPACT_DIMENSIONS = {
    width: '200px',
    height: '80px'
} as const;

/**
 * Popover dimensions for values that should render in a full-size container.
 * Suitable for multi-line pretty-printed JSON of objects and arrays.
 */
export const INSPECTOR_FULL_DIMENSIONS = {
    width: '450px',
    height: '350px'
} as const;

/**
 * Value types that render as pretty-printed JSON in the inspector. All other
 * types render as plain text to avoid false JSON syntax errors on bare
 * strings, dates, `NaN`, `Infinity`, etc.
 */
const STRUCTURED_VALUE_TYPES: ReadonlyArray<WorkerDatasetViewerValueType> = [
    'object',
    'array'
];

const isStructuredType = (valueType: WorkerDatasetViewerValueType): boolean =>
    STRUCTURED_VALUE_TYPES.includes(valueType);

/**
 * Monaco editor language for a given value type. Structured values use `json`
 * for syntax highlighting; all other values use `plaintext` so the editor
 * doesn't report bare strings or dates as invalid JSON.
 */
export const getInspectorLanguage = (
    valueType: WorkerDatasetViewerValueType
): 'json' | 'plaintext' => (isStructuredType(valueType) ? 'json' : 'plaintext');

/**
 * Popover container dimensions for a given value type. Structured values get
 * the full-size container; scalar values get the compact container.
 */
export const getInspectorDimensions = (
    valueType: WorkerDatasetViewerValueType
): { width: string; height: string } =>
    isStructuredType(valueType)
        ? INSPECTOR_FULL_DIMENSIONS
        : INSPECTOR_COMPACT_DIMENSIONS;

/**
 * Formats a raw cell value for display in the read-only inspector. Structured
 * values are pretty-printed JSON; all other values are their plain string
 * representation (including the literals `"null"` and `"undefined"`). Returns
 * an empty string on formatting failure so the editor renders gracefully.
 */
export const formatInspectorValue = (
    rawValue: unknown,
    valueType: WorkerDatasetViewerValueType
): string => {
    try {
        if (isStructuredType(valueType)) {
            return formatJson(rawValue) ?? '';
        }
        return String(rawValue);
    } catch {
        return '';
    }
};
