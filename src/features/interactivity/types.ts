/**
 * Indicates how a cross-highlight value compares with its original (base)
 * value.
 */
export type TDataPointHighlightComparator = 'lt' | 'eq' | 'gt' | 'neq';

/**
 * Indicates the internal highlight state of a data field. This currently just
 * mirrors `TDataPointSelectionStatus` but is declared here for future-proofing
 * purposes.
 */
export type TDataPointHighlightStatus = TDataPointSelectionStatus;

/**
 * Indicates the internal selection state of a data point.
 */
export type TDataPointSelectionStatus = 'off' | 'neutral' | 'on';

/**
 * Indicates the type of selection mode that is currently active.
 */
export type SelectionMode = 'simple' | 'advanced';

/**
 * Used to denote supported interactivity types within Deneb. These can be used
 * to flag any contextual methods for any particular functionality.
 */
export type TInteractivityType = 'tooltip' | 'highlight' | 'select' | 'context';
