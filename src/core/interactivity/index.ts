export * as selection from './selection';
export * as tooltip from './tooltip';
export {
    interactivityReservedWords,
    isInteractivityReservedWord,
    resolveCoordinates,
    TDataPointSelectionStatus
};

/**
 * Ternary flag for data points, in order to allow us to format them in specific ways.
 */
type TDataPointSelectionStatus = 'off' | 'neutral' | 'on';

/**
 * Array of reserved keywords used to handle selection IDs from the visual's default data view.
 */
const interactivityReservedWords = ['__identity__', '__key__'];

/**
 * Help method to determine if a supplied key (string) is reserved for interactivity purposes.
 */
const isInteractivityReservedWord = (word: string) =>
    interactivityReservedWords.indexOf(word) > -1;

/**
 *For the supplied event, returns an [x, y] array of mouse coordinates.
 */
const resolveCoordinates = (event: MouseEvent): [number, number] => [
    event.clientX,
    event.clientY
];
