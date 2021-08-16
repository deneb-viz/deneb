import { IVegaViewDatum } from '../vega';

export * as selection from './selection';
export * as tooltip from './tooltip';
export {
    interactivityReservedWords,
    isInteractivityReservedWord,
    resolveCoordinates,
    resolveDatumToArray
};

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

/**
 * For a given datum, resolve it to an array of keys and values. Addiitonally, we can (optionally) ensure that the
 * `interactivityReservedWords` are stripped out so that we can get actual fields and values assigned to a datum.
 */
const resolveDatumToArray = (obj: IVegaViewDatum, filterReserved = true) =>
    Object.entries({ ...obj }).filter(
        ([k, v]) => (filterReserved && !isInteractivityReservedWord(k)) || k
    );
