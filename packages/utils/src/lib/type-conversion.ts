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
 * Tests a value for date-like compatibility and converts it to a Date. Returns `undefined` if conversion is not
 * possible.
 */
export function toDate(_: unknown) {
    if (_ instanceof Date) return _;
    if (typeof _ === 'string' || typeof _ === 'number') {
        const d = new Date(_);
        if (!isNaN(d.getTime())) return d;
    }
    return undefined;
}

/**
 * Tests a value for number-like compatibility and converts it to a number. Returns `undefined` if conversion is not
 * possible.
 */
export function toNumber(_: unknown) {
    if (typeof _ === 'number') return _;
    if (typeof _ === 'string') {
        const n = Number(_.trim());
        if (!isNaN(n)) return n;
    }
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
