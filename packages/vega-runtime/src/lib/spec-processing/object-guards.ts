/** Tests whether a value is a non-null, non-array object. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Tests whether an object has the property as its own, not inherited. */
export const hasOwn = (target: object, property: string): boolean =>
    Object.prototype.hasOwnProperty.call(target, property);
