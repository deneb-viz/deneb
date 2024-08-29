/**
 * Generate a new UUID.
 */
export function getNewUuid() {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }
    return getFallbackUUid();
}

/**
 * For environments that don't have access to the crypto API, generate two simple UUIDs and combine them to create a
 * valid "good enough" UUID.
 */
export function getFallbackUUid() {
    const a = getRandomUuidSegment();
    const b = getRandomUuidSegment();
    return (
        a.slice(0, 8) +
        '-' +
        a.slice(8, 12) +
        '-4' +
        a.slice(13) +
        '-a' +
        b.slice(1, 4) +
        '-' +
        b.slice(4)
    );
}

/**
 * For browsers that don't have the crypto API (or HTTP environments), we can use this polyfill to generate a "good
 * enough" UUID segment that we can combine upstream.
 */
export function getRandomUuidSegment() {
    return (
        '00000000000000000' +
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        (Math.random() * 0xffffffffffffffff).toString(16)
    ).slice(-16);
}
