/**
 * Tests a value for boolean-like compatibility and converts it to a boolean. Returns `undefined` if conversion is not
 * possible.
 */
export function toBoolean(_: unknown) {
    if (typeof _ === 'boolean') return _;
    if (typeof _ === 'string') {
        const s = _.toLowerCase().trim();
        if (['1', 'true', 'yes', 'on'].includes(s)) return true;
        if (['0', 'false', 'no', 'off', ''].includes(s)) return false;
    }
    if (typeof _ === 'number') return _ !== 0;
    return undefined;
}

/**
 * Converts a string to a Uint8Array, suitable for inclusion in a worker as a `Transferable`.
 */
export function stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

/*
 * Converts a Uint8Array to a string.
 */
export function uint8ArrayToString(arr: Uint8Array): string {
    return new TextDecoder().decode(arr);
}
