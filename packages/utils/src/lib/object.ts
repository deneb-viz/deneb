/**
 * Path for a nested object. Each element in the array is a key to access the next level of the object.
 */
export type DeepPath = Array<string | number>;

/**
 * Value that can be stored in a settings property.
 */
export type DeepValue = string | number | boolean | object | unknown;

/**
 * For updating a value in a nested object.
 */
export type DeepUpdate<T, Path, Value> = Path extends [infer Key, ...infer Rest]
    ? Key extends keyof T
        ? {
              [K in keyof T]: K extends Key
                  ? DeepUpdate<T[K], Rest, Value>
                  : T[K];
          }
        : T
    : T;

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
 * For the supplied object, path and value, update the object with the value at the path. If the path is invalid, return
 * the object unchanged.
 */
export const updateDeep = <T>(
    obj: T,
    path: DeepPath,
    value: DeepValue
): DeepUpdate<T, DeepPath, DeepValue> => {
    if (path.length === 0) return value as DeepUpdate<T, DeepPath, DeepValue>;
    const [key, ...rest] = path;

    if (typeof key === 'number' && Array.isArray(obj)) {
        const arr = obj.slice();
        arr[key] = updateDeep(arr[key], rest, value);
        return arr as DeepUpdate<T, DeepPath, DeepValue>;
    }

    if (typeof key === 'string' || typeof key === 'number') {
        return {
            ...obj,
            [key]: updateDeep(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (obj as any)[key] ?? (typeof rest[0] === 'number' ? [] : {}),
                rest,
                value
            )
        } as DeepUpdate<T, DeepPath, DeepValue>;
    }

    return obj as DeepUpdate<T, DeepPath, DeepValue>;
};
