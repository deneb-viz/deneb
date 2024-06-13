/**
 * Converts a string to a Uint8Array, suitable for inclusion in a worker as a `Transferable`.
 */
export const stringToUint8Array = (str: string): Uint8Array =>
    new TextEncoder().encode(str);

/*
 * Converts a Uint8Array to a string.
 */
export const uint8ArrayToString = (arr: ArrayBuffer): string =>
    new TextDecoder().decode(arr);
