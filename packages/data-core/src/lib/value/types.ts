/**
 * Indicates how a cross-highlight value compares with its original (base)
 * value.
 */
export type DataPointHighlightComparator = 'lt' | 'eq' | 'gt' | 'neq';

/**
 * Indicates the internal selection state of a data point.
 */
export type DataPointSelectionStatus = 'off' | 'neutral' | 'on';

/**
 * Represents a primitive value for processing.
 */
export type PrimitiveValue = string | number | boolean | Date;

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega events or data streams and
 * usually casted as `any`.
 */
export type VegaDatum = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};
