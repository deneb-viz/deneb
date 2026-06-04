import { logDebug } from '@deneb-viz/utils/logging';

/**
 * Module-level flag that, when true, causes the persistence layer
 * ({@link persistProperties} and {@link persistProjectProperties}) to
 * short-circuit without calling `host.persistProperties(...)`. The
 * orchestrator (`Deneb.update`) sets this flag at the very top of each
 * update based on {@link isReportInReadMode}, so any persist attempt
 * triggered during that update — whether directly from the migration
 * code or indirectly via the project-sync subscriber observing
 * downstream slice changes — is suppressed without each call site
 * having to know the visual's mode.
 *
 * This is a defence-in-depth complement to the higher-level
 * `handlePropertyMigration` gate. The high-level gate prevents the
 * read-mode update from flipping `migrationCheckPerformed` and opening
 * the version-change modal; this low-level gate catches every other
 * persist path (e.g. legacy support-field-configuration setters fired
 * from `getMappedDataset` in `src/lib/dataset/processing.ts`, which
 * route through `persistProjectProperties` via the slice-sync
 * subscriber, and which would otherwise leak persistence in read mode
 * even with the high-level gate in place).
 *
 * The flag is intentionally module-level and not on a Zustand slice:
 * (a) persist call sites span both root `src/` and the app-core
 * package, and routing through a slice would force app-core to know
 * about read-mode semantics; (b) the flag changes at a well-defined
 * point (start of each `Deneb.update`), so there is no benefit to the
 * reactive-subscribe model a slice would provide.
 */
let suppressed = false;

/**
 * Set whether the persistence layer should suppress writes for the
 * current update. Called by `Deneb.update` at the top of every update
 * with the resolved read-mode state.
 */
export const setReadModePersistSuppressed = (value: boolean): void => {
    if (suppressed !== value) {
        logDebug(
            `[read-mode-gate] persistence suppression set to ${value} for the current update`
        );
    }
    suppressed = value;
};

/**
 * Whether persistence is currently suppressed for the in-flight update.
 * Both `persistProperties` and `persistProjectProperties` consult this
 * before dispatching to the host.
 */
export const isReadModePersistSuppressed = (): boolean => suppressed;
