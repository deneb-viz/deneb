/**
 * @privateRemarks
 * This file exists so that we have our own versions of lodash functions, which are tree-shakeable.
 */

/**
 * A predicate function that takes a value and a key, and returns a boolean.
 */
type Predicate<T> = (value: T[keyof T], key: keyof T) => boolean;

/**
 * Pick the properties of an object that satisfy a predicate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickBy<T extends Record<string, any>>(
    object: T,
    predicate: Predicate<T>
): Partial<T> {
    const result: Partial<T> = {};
    for (const key in object) {
        if (predicate(object[key], key)) {
            result[key] = object[key];
        }
    }
    return result;
}
