import { DATASET_IDENTITY_NAME, DATASET_KEY_NAME } from '../../constants';

export * as selection from './selection';
export * as tooltip from './tooltip';

/**
 * Interactivity flags for data points, in order to allow us to format them in
 * specific ways.
 */
export type TDataPointSelectionStatus = 'off' | 'neutral' | 'on';
export type TDataPointHighlightComparator = 'lt' | 'eq' | 'gt' | 'neq';

/**
 * Array of reserved keywords used to handle selection IDs from the visual's
 * default data view.
 */
export const interactivityReservedWords = [
    DATASET_IDENTITY_NAME,
    DATASET_KEY_NAME
];

/**
 * Helper method to determine if a supplied key (string) is reserved for
 * interactivity purposes.
 */
export const isInteractivityReservedWord = (word: string) =>
    interactivityReservedWords.indexOf(word) > -1;

/**
 *For the supplied event, returns an [x, y] array of mouse coordinates.
 */
export const resolveCoordinates = (event: MouseEvent): [number, number] => [
    event?.clientX,
    event?.clientY
];
