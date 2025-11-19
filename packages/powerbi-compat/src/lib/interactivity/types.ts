/**
 * Indicates the internal selection state of a data point.
 */
export type DataPointSelectionStatus = 'off' | 'neutral' | 'on';

/**
 * Indicates the type of selection mode that is currently active.
 * `simple` = legacy selection mode (let Deneb do it for me);
 * `advanced` = advanced selection mode (let me do it for Deneb).
 */
export type SelectionMode = 'simple' | 'advanced';
