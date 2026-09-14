import { logError } from '@deneb-viz/utils/logging';

/**
 * Resolve whether the host permits downloads, denying by default. A rejected
 * `exportStatus()` (host error) resolves to `false` — a definite disabled
 * state — rather than leaving the download UI stuck indeterminate on an
 * unresolved `undefined`, and never escapes as an unhandled promise rejection.
 *
 * Takes the status thunk and the "allowed" sentinel as arguments so it stays
 * decoupled from `powerbi-visuals-api` and is unit-testable without the host.
 */
export const resolveDownloadPermitted = async <T>(
    exportStatus: () => PromiseLike<T>,
    allowedStatus: T
): Promise<boolean> => {
    try {
        return (await exportStatus()) === allowedStatus;
    } catch (e) {
        logError(
            'Failed to resolve download export status; denying download by default.',
            e
        );
        return false;
    }
};
