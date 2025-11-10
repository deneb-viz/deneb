/**
 * @privateRemarks
 * This file exists so that we have our own versions of lodash functions, which are tree-shakeable.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObject } from '@deneb-viz/utils/inspection';

/**
 * A predicate function that takes a value and a key, and returns a boolean.
 */
type Predicate<T> = (value: T[keyof T], key: keyof T) => boolean;

/**
 * Deep clone an object.
 */
export function merge<T extends Record<string, any>>(
    target: T,
    ...sources: any[]
): T {
    const result: T = structuredClone(target);
    sources.forEach((source) => {
        const clonedSource = structuredClone(source);
        if (isObject(result) && isObject(clonedSource)) {
            Object.keys(clonedSource).forEach((key) => {
                if (isObject(clonedSource[key])) {
                    if (!result[key]) {
                        (result as any)[key] = {};
                    }
                    (result as any)[key] = merge(
                        result[key],
                        clonedSource[key]
                    );
                } else {
                    (result as any)[key] = clonedSource[key];
                }
            });
        }
    });
    return result;
}

/**
 * Pick the properties of an object that satisfy a predicate.
 */
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
