import stringify from 'json-stringify-pretty-compact';
import { isDate, isObject } from './inspection';

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
 * Options for stringifying objects.
 */
export type StringifyOptions = {
    maxDepth?: number;
    whitespaceChar?: string;
    maxLength?: number;
};

/**
 * Default maximum depth for pruning deep objects. This is used to prevent excessive recursion
 * and potential performance issues when dealing with deeply nested objects.
 */
const DEFAULT_MAX_PRUNE_DEPTH = 3;

/**
 * Default whitespace character for stringify operations.
 */
const DEFAULT_WHITESPACE_CHAR = ' ';

/**
 * Default maximum line length for stringify operations.
 */
const DEFAULT_LINE_LENGTH = 40;

/**
 * Prune an object at a specified level of depth.
 */
export const getPrunedObject = (
    json: object,
    options: StringifyOptions = {}
) => {
    const {
        maxDepth = DEFAULT_MAX_PRUNE_DEPTH,
        whitespaceChar = DEFAULT_WHITESPACE_CHAR,
        maxLength = DEFAULT_LINE_LENGTH
    } = options;
    const pruned = stringifyPruned(json, {
        maxDepth,
        whitespaceChar,
        maxLength
    });
    return JSON.parse(pruned);
};

/**
 * Ensure that tooltip values are correctly sanitized for output into a default tooltip.
 */
export const getSanitizedTooltipValue = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    whitespaceChar = DEFAULT_WHITESPACE_CHAR
) =>
    isObject(value) && !isDate(value)
        ? stringifyPruned(value, {
              whitespaceChar
          })
        : `${value}`;

/**
 * Checks if an object matches all key-value pairs in the source object.
 */
export const matchesObjectKeyValues =
    (source: Record<string, unknown>) =>
    (object: Record<string, unknown>): boolean => {
        for (const [key, value] of Object.entries(source)) {
            if (object[key] !== value) {
                return false;
            }
        }
        return true;
    };

/**
 * Create a stringified representation of an object, pruned at a specified level of depth.
 */
export const stringifyPruned = (
    json: object,
    options: StringifyOptions = {}
) => {
    const {
        maxDepth = DEFAULT_MAX_PRUNE_DEPTH,
        whitespaceChar = DEFAULT_WHITESPACE_CHAR,
        maxLength = DEFAULT_LINE_LENGTH
    } = options;
    return stringify(json, {
        maxLength,
        indent: whitespaceChar,
        replacer: prune(maxDepth)
    });
};

/**
 * For a given object, prune at the specified level of depth. Borrowed and adapted from vega-tooltip.
 */
export const prune = (maxDepth = DEFAULT_MAX_PRUNE_DEPTH) => {
    const stack: unknown[] = [];
    return function (this: unknown, key: string, value: unknown) {
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }
        if (typeof value !== 'object') {
            return value;
        }
        const pos = stack.indexOf(this) + 1;
        stack.length = pos;
        /**
         * We're hitting memory limits when we try to stringify the dataflow, as it contains the scenegraph (#352). We
         * manually remove the scenegraph from the dataflow here.
         */
        if (
            key === 'dataflow' &&
            '_scenegraph' in (value as Record<string, unknown>)
        ) {
            // Return a shallow copy without `_scenegraph` instead of mutating (#419)
            const dataflow = value as Record<string, unknown>;
            const copy: Record<string, unknown> = {};
            for (const k in dataflow) {
                if (k !== '_scenegraph') {
                    copy[k] = dataflow[k];
                }
            }
            value = copy;
        }
        if (stack.length > maxDepth) {
            return '[OBJECT]';
        }
        if (stack.indexOf(value) >= 0) {
            return '[CIRCULAR]';
        }
        stack.push(value);
        return value;
    };
};

/**
 * Lightweight replacement for lodash.omit (top-level only).
 * Returns a shallow clone of obj without the specified keys.
 * If obj is null/undefined, returns an empty object.
 */
export function omit<
    T extends Record<string, unknown>,
    K extends readonly (keyof T | string)[]
>(obj: T, keys: K): Omit<T, Extract<K[number], keyof T>> {
    if (obj == null) return {} as Omit<T, Extract<K[number], keyof T>>;
    const exclude = new Set<string>(keys.map(String));
    const result: Partial<T> = {};
    for (const key in obj) {
        if (
            Object.prototype.hasOwnProperty.call(obj, key) &&
            !exclude.has(key)
        ) {
            result[key as keyof T] = obj[key];
        }
    }
    return result as Omit<T, Extract<K[number], keyof T>>;
}

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
