/**
 * Generate a new UUID.
 */
export function getNewUuid() {
    return 'xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx'
        .replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))
        .replace(/N/g, () => ((Math.random() * 4) | (0 + 8)).toString(16));
}
