/**
 * A predicate function that takes a value and a key, and returns a boolean.
 */
type Predicate<T> = (value: T[keyof T], key: keyof T) => boolean;

/**
 * Pick the properties of an object that satisfy a predicate.
 */
export function pickBy<T extends Record<string, unknown>>(
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

/**
 * Set a value at a given path within an object. Creates nested objects as needed.
 * Overwrites non-object values (primitives, arrays, null) with objects when needed.
 */
export function set(obj: any, path: string | string[], value: any) {
    const keys = Array.isArray(path) ? path : path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((acc, key) => {
        // Replace the value if it's not a plain object (undefined, null, primitive, or array)
        if (
            acc[key] === null ||
            acc[key] === undefined ||
            typeof acc[key] !== 'object' ||
            Array.isArray(acc[key])
        ) {
            acc[key] = {};
        }
        return acc[key];
    }, obj);
    target[lastKey] = value;
    return obj;
}
