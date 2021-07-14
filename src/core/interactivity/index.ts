import { IVegaViewDatum } from '../vega';

export * as tooltip from './tooltip';

// Array of reserved keywords used to handle selection IDs from the visual's default data view.
export const interactivityReservedWords = ['__identity__', '__key__'];

// Help method to determine if a supplied key (string) is
export const isInteractivityReservedWord = (word: string) =>
    interactivityReservedWords.indexOf(word) > -1;

// For a given datum, ensure that the `interactivityReservedWords` are stripped out so that we can get actual fields and values assigned to a datum.
export const resolveDatumForKeywords = (obj: IVegaViewDatum) =>
    Object.entries({ ...obj }).filter(
        ([k, v]) => !isInteractivityReservedWord(k)
    );
