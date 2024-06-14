/**
 * Converts a string to a Uint8Array, suitable for inclusion in a worker as a `Transferable`.
 */
export function stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

/*
 * Converts a Uint8Array to a string.
 */
export function uint8ArrayToString(arr: ArrayBuffer): string {
    return new TextDecoder().decode(arr);
}
