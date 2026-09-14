import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Ordered migration registry for the persisted `stateManagement` payload.
 *
 * This module is the SINGLE OWNER of version comparison for the
 * `stateManagement` persisted-property payload (the `denebMetaVersion`
 * stamp defined in `model/settings-state-management.ts` and mapped through
 * `src/lib/state/project-sync-mappings.ts`). Every future change to the
 * payload's shape registers an entry here; no other code may compare the
 * stamp directly.
 *
 * Two migration classes share the one version stamp:
 *
 *  - `'load-time'` — payload-shape migrations that need nothing beyond the
 *    persisted payload itself. Applied in sequence on load via
 *    `runStateManagementLoadTimeMigrations` (invoked from
 *    `migration.ts#handlePropertyMigration`).
 *  - `'first-dataview'` — data-dependent migrations that need DataView
 *    columns and/or `jsonSpec` context unavailable at load (the legacy
 *    support-field stamping). The registry decides WHETHER such an entry
 *    runs (`isStateManagementMigrationPending`); the entry's execution
 *    point lives in the dataset mapping pass (`src/lib/dataset/`).
 *
 * Versioning model: `denebMetaVersion` is an integer. `0` (absent/empty)
 * is the unversioned pre-2.0 state; `2` is the first stamped version
 * (version `1` never shipped — the jump is intentional and encoded in the
 * first entry's `fromVersion: 0, toVersion: 2`). 2.0 is the LAST
 * unversioned shape the code ever has to sniff: any later shape change
 * appends an entry `{ fromVersion: 2, toVersion: 3, ... }` and so on.
 *
 * Institutional constraints encoded here (and covered by
 * `__test__/state-management-migration.test.ts`):
 *
 *  - Idempotency against the sync layer's ~5s stale-echo window: re-running
 *    any entry on already-migrated state is a no-op
 *    (docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md).
 *  - Partial persisted states are MERGED, never replaced: migrations return
 *    a patch which is spread over the input payload.
 *  - Cross-GUID awareness: an empty payload (fresh visual, or a .pbix from
 *    a different packaging-channel GUID, where NO persisted properties
 *    carry over) is NOT legacy. The discriminator is project content
 *    (`jsonSpec` differs from the factory default) — the `stateManagement`
 *    object of a genuine pre-2.0 visual is also empty, but its `jsonSpec`
 *    is not
 *    (docs/solutions/best-practices/validate-migrations-on-matching-channel-builds-2026-06-03.md).
 *  - Corrupt persisted values surface a typed signal
 *    (`StateManagementCorruptKey`) and are never silently reset.
 */

/**
 * When a registered migration executes:
 *
 *  - `'load-time'`: applied in sequence on load from
 *    `migration.ts` — must carry a `migrate` function.
 *  - `'first-dataview'`: executed from the dataset mapping pass, which
 *    supplies its own execution point and stamps
 *    `getStateManagementVersionToStamp(id)` on completion. The registry
 *    only answers WHETHER it is pending.
 */
export type StateManagementMigrationClass = 'load-time' | 'first-dataview';

/**
 * The persisted `stateManagement` payload, as raw persisted values (JSON
 * keys are still serialized strings at this level — parsing/validation is
 * the registry's job so corrupt values can be surfaced, not swallowed).
 * Add new keys here as the payload grows; any shape change to an EXISTING
 * key requires a new registry entry.
 */
export interface StateManagementPayload {
    viewportHeight?: string | null;
    viewportWidth?: string | null;
    supportFieldConfiguration?: string;
    denebMetaVersion?: string;
    scaleToZoom?: boolean;
    consolidateFieldParameters?: boolean;
}

/**
 * Context the registry needs to make applicability decisions that the
 * payload alone cannot answer (the cross-GUID/fresh-visual distinction).
 */
export interface StateManagementMigrationContext {
    /**
     * `true` when the visual has real project content (persisted
     * `jsonSpec` differs from the factory default). Compute via
     * `hasProjectContent()`.
     */
    hasProjectContent: boolean;
}

interface StateManagementMigrationEntryBase {
    /**
     * Stable unique identifier — referenced by class `'first-dataview'`
     * execution points and reported in migration results.
     */
    id: string;
    /**
     * The payload schema version this entry migrates FROM. Entries must
     * form a contiguous ascending chain starting at 0.
     */
    fromVersion: number;
    /**
     * The payload schema version this entry produces. Must equal the next
     * entry's `fromVersion` (or defines the current version if last).
     */
    toVersion: number;
    /**
     * Human-readable summary of what the migration does.
     */
    description: string;
    /**
     * When `true`, the entry only applies to payloads belonging to a real
     * project (see `StateManagementMigrationContext.hasProjectContent`).
     * Fresh visuals and cross-GUID imports skip it — they are not legacy.
     *
     * IMPORTANT — this flag is ADDITIVE on top of payload classification,
     * not an independent gate. A project-less payload below the current
     * version classifies as `'empty-or-cross-guid'` and returns before the
     * load-time loop runs (see `runStateManagementLoadTimeMigrations`), so a
     * `'load-time'` entry with `requiresProjectContent: false` still does
     * NOT run for such payloads — the classification guard is the primary
     * gate and this flag only tightens it further when project content IS
     * present. A migration that must run for ALL payloads regardless of
     * project content (e.g. a viewport-dimension schema change) would need
     * the classification step revisited, not just this flag cleared.
     */
    requiresProjectContent: boolean;
}

export interface StateManagementLoadTimeMigrationEntry extends StateManagementMigrationEntryBase {
    migrationClass: 'load-time';
    /**
     * Transform the payload. Returns a PATCH that is merged over the input
     * (`{ ...payload, ...patch }`) — never a replacement, so keys the
     * migration does not know about are preserved.
     */
    migrate: (
        payload: Readonly<StateManagementPayload>
    ) => Partial<StateManagementPayload>;
}

export interface StateManagementFirstDataviewMigrationEntry extends StateManagementMigrationEntryBase {
    migrationClass: 'first-dataview';
}

export type StateManagementMigrationEntry =
    | StateManagementLoadTimeMigrationEntry
    | StateManagementFirstDataviewMigrationEntry;

/**
 * Thrown when the registry itself is malformed (gap, out-of-order or
 * duplicate registration, non-advancing entry, wrong class shape) or when
 * an unknown migration id is queried. This is a programming error and is
 * intentionally loud — a broken registry must never ship.
 */
export class StateManagementRegistryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StateManagementRegistryError';
    }
}

/**
 * Typed signal for a persisted key whose value could not be parsed.
 * Surfaced to the caller (NOT a silent reset — the raw value is left in
 * place); U3 wires the durable UI surfacing.
 */
export interface StateManagementCorruptKey {
    key: keyof StateManagementPayload;
    rawValue: string;
    error: string;
}

/**
 * How the registry classifies a persisted payload before deciding what to
 * run:
 *
 *  - `'empty-or-cross-guid'` — no project content: a fresh visual, or a
 *    .pbix saved under a different packaging-channel GUID (persisted
 *    properties do not carry across GUIDs). NOT legacy; migrations that
 *    require project content do not run.
 *  - `'unversioned-legacy'` — real project content with no version stamp:
 *    a genuine pre-2.0 payload.
 *  - `'versioned-outdated'` — stamped, but below the current version.
 *  - `'current'` — stamped at (or above) the current version; everything
 *    is a no-op. "Above" covers a report last saved by a newer visual
 *    build — never migrate downwards.
 *  - `'indeterminate'` — the version stamp itself is unreadable. Fail-safe:
 *    run nothing (re-running migrations on possibly-migrated state risks
 *    double application) and surface the corrupt-key signal.
 */
export type StateManagementPayloadClassification =
    | 'empty-or-cross-guid'
    | 'unversioned-legacy'
    | 'versioned-outdated'
    | 'current'
    | 'indeterminate';

/**
 * Result of the load-time migration pipeline. `payload` is the (merged)
 * migrated payload — deep-equal to the input when nothing applied.
 */
export interface StateManagementLoadMigrationResult {
    payload: StateManagementPayload;
    /**
     * The schema version the returned payload reflects (unchanged when no
     * entry applied).
     */
    version: number;
    classification: StateManagementPayloadClassification;
    /**
     * Ids of `'load-time'` entries applied by this run, in order.
     */
    applied: string[];
    /**
     * Ids of pending `'first-dataview'` entries the load-time pipeline
     * cannot run — they execute later from the dataset mapping pass.
     * Entries registered after a pending first-dataview entry are blocked
     * behind it (they assume its output shape).
     */
    pendingFirstDataview: string[];
    corruptKeys: StateManagementCorruptKey[];
}

/**
 * Id of the legacy support-field stamping migration (class
 * `'first-dataview'`) — the dataset mapping pass queries the registry with
 * this id.
 */
export const SUPPORT_FIELD_LEGACY_MIGRATION_ID =
    'support-field-legacy-defaults';

/**
 * THE registry. Ordered, contiguous chain of every shape change to the
 * `stateManagement` payload. Append new entries at the end with
 * `fromVersion` equal to the previous entry's `toVersion`; integrity is
 * asserted on every pipeline/query call and contract-tested.
 */
const STATE_MANAGEMENT_MIGRATIONS: readonly StateManagementMigrationEntry[] = [
    {
        id: SUPPORT_FIELD_LEGACY_MIGRATION_ID,
        fromVersion: 0,
        toVersion: 2,
        migrationClass: 'first-dataview',
        requiresProjectContent: true,
        description:
            'Stamp resolved legacy support-field defaults (all support ' +
            'fields enabled) into supportFieldConfiguration for pre-2.0 ' +
            'projects, and pin consolidateFieldParameters off. Needs ' +
            'DataView columns, so it executes from the dataset mapping ' +
            'pass. toVersion 2 skips 1 deliberately: version 1 never ' +
            'shipped.'
    }
];

/**
 * Validate a registry: entries must form a contiguous, ascending chain
 * starting at version 0, each entry must advance the version, and each
 * class must have the right shape. Throws `StateManagementRegistryError`
 * on the first violation — a gap or out-of-order registration is a hard
 * error, never a silent skip.
 */
export const assertStateManagementRegistryIntegrity = (
    entries: readonly StateManagementMigrationEntry[]
): void => {
    if (entries.length === 0) {
        throw new StateManagementRegistryError(
            'Migration registry must contain at least one entry.'
        );
    }
    const seenIds = new Set<string>();
    let expectedFromVersion = 0;
    for (const entry of entries) {
        if (
            !Number.isInteger(entry.fromVersion) ||
            !Number.isInteger(entry.toVersion)
        ) {
            throw new StateManagementRegistryError(
                `Migration '${entry.id}' has non-integer versions ` +
                    `(${entry.fromVersion} -> ${entry.toVersion}).`
            );
        }
        if (entry.fromVersion !== expectedFromVersion) {
            throw new StateManagementRegistryError(
                `Migration '${entry.id}' is out of order or leaves a gap: ` +
                    `expected fromVersion ${expectedFromVersion}, got ` +
                    `${entry.fromVersion}. Entries must form a contiguous ` +
                    'ascending chain starting at 0.'
            );
        }
        if (entry.toVersion <= entry.fromVersion) {
            throw new StateManagementRegistryError(
                `Migration '${entry.id}' does not advance the version ` +
                    `(${entry.fromVersion} -> ${entry.toVersion}).`
            );
        }
        if (seenIds.has(entry.id)) {
            throw new StateManagementRegistryError(
                `Migration id '${entry.id}' is registered more than once.`
            );
        }
        if (
            entry.migrationClass === 'load-time' &&
            typeof entry.migrate !== 'function'
        ) {
            throw new StateManagementRegistryError(
                `Load-time migration '${entry.id}' must supply a migrate ` +
                    'function.'
            );
        }
        if (
            entry.migrationClass === 'first-dataview' &&
            'migrate' in entry &&
            (entry as { migrate?: unknown }).migrate !== undefined
        ) {
            throw new StateManagementRegistryError(
                `First-dataview migration '${entry.id}' must not supply a ` +
                    'migrate function — its execution point lives in the ' +
                    'dataset mapping pass.'
            );
        }
        seenIds.add(entry.id);
        expectedFromVersion = entry.toVersion;
    }
};

/**
 * Validate the canonical registry ONCE at import. It is a module-level
 * `const` and cannot change between calls, so query paths that default to
 * it (`getEntryById`) skip the per-call O(n) re-scan — the check has already
 * fired here. Custom registries passed explicitly (by tests) are still
 * validated on use. Throws at import if the shipped registry is malformed.
 */
assertStateManagementRegistryIntegrity(STATE_MANAGEMENT_MIGRATIONS);

/**
 * The current `stateManagement` schema version — the last registry entry's
 * `toVersion`. This is the value newly-completed migrations stamp.
 */
export const getCurrentStateManagementVersion = (
    entries: readonly StateManagementMigrationEntry[] = STATE_MANAGEMENT_MIGRATIONS
): number => {
    assertStateManagementRegistryIntegrity(entries);
    return entries[entries.length - 1].toVersion;
};

/**
 * `true` when the visual has real project content, i.e. its persisted
 * `jsonSpec` differs from the factory default. This is the discriminator
 * between "genuinely unversioned pre-2.0 payload" and "empty payload
 * because fresh visual / cross-GUID import" — both have an empty
 * `stateManagement` object, but only the former has a project.
 */
export const hasProjectContent = (jsonSpec: string): boolean =>
    jsonSpec !== PROJECT_DEFAULTS.spec;

const DENEB_META_VERSION_PATTERN = /^\d+$/;

/**
 * Parse the persisted version stamp. Absent/empty means unversioned (0).
 * A non-numeric value is corrupt: surfaced as a signal, with the version
 * reported as `null` so callers fail safe (run nothing) rather than
 * re-running migrations against possibly-migrated state.
 */
export const parseDenebMetaVersion = (
    raw: string | undefined | null
): { version: number | null; corrupt?: StateManagementCorruptKey } => {
    if (raw === undefined || raw === null || raw === '') {
        return { version: 0 };
    }
    if (DENEB_META_VERSION_PATTERN.test(raw)) {
        return { version: parseInt(raw, 10) };
    }
    return {
        version: null,
        corrupt: {
            key: 'denebMetaVersion',
            rawValue: raw,
            error: `Expected an integer string, got '${raw}'.`
        }
    };
};

/**
 * Inspect a payload without mutating it: parse the version stamp, detect
 * corrupt persisted values (typed signals, never a reset), and classify.
 */
export const inspectStateManagementPayload = (
    payload: Readonly<StateManagementPayload>,
    context: StateManagementMigrationContext,
    entries: readonly StateManagementMigrationEntry[] = STATE_MANAGEMENT_MIGRATIONS
): {
    version: number | null;
    classification: StateManagementPayloadClassification;
    corruptKeys: StateManagementCorruptKey[];
} => {
    const currentVersion = getCurrentStateManagementVersion(entries);
    const corruptKeys: StateManagementCorruptKey[] = [];
    const { version, corrupt } = parseDenebMetaVersion(
        payload.denebMetaVersion
    );
    if (corrupt) {
        corruptKeys.push(corrupt);
    }
    const supportFieldRaw = payload.supportFieldConfiguration;
    if (supportFieldRaw !== undefined && supportFieldRaw !== '') {
        try {
            JSON.parse(supportFieldRaw);
        } catch (e) {
            corruptKeys.push({
                key: 'supportFieldConfiguration',
                rawValue: supportFieldRaw,
                error: e instanceof Error ? e.message : String(e)
            });
        }
    }
    const classification: StateManagementPayloadClassification =
        version === null
            ? 'indeterminate'
            : version >= currentVersion
              ? 'current'
              : !context.hasProjectContent
                ? 'empty-or-cross-guid'
                : version === 0
                  ? 'unversioned-legacy'
                  : 'versioned-outdated';
    return { version, classification, corruptKeys };
};

const getEntryById = (
    id: string,
    entries: readonly StateManagementMigrationEntry[]
): StateManagementMigrationEntry => {
    // The canonical registry is validated once at import; only re-validate a
    // caller-supplied (test) registry, which may be malformed by design.
    if (entries !== STATE_MANAGEMENT_MIGRATIONS) {
        assertStateManagementRegistryIntegrity(entries);
    }
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
        throw new StateManagementRegistryError(`Unknown migration id '${id}'.`);
    }
    return entry;
};

/**
 * The WHETHER decision for a single registered migration — the seam that
 * class `'first-dataview'` execution points call. `true` when the payload
 * predates the entry's output shape (and its applicability context is
 * satisfied). Already-migrated payloads — including a stale echo of the
 * migration's own persisted output — return `false`.
 */
export const isStateManagementMigrationPending = (
    id: string,
    payloadVersion: number,
    context: StateManagementMigrationContext,
    entries: readonly StateManagementMigrationEntry[] = STATE_MANAGEMENT_MIGRATIONS
): boolean => {
    const entry = getEntryById(id, entries);
    if (entry.requiresProjectContent && !context.hasProjectContent) {
        return false;
    }
    return payloadVersion < entry.toVersion;
};

/**
 * The version a `'first-dataview'` execution point must stamp on
 * completion of the given migration. Routing the stamp through this (U3)
 * keeps the number owned by the registry.
 */
export const getStateManagementVersionToStamp = (
    id: string,
    entries: readonly StateManagementMigrationEntry[] = STATE_MANAGEMENT_MIGRATIONS
): number => getEntryById(id, entries).toVersion;

/**
 * Registry-owned replacement for the legacy `isLegacySpec` version sniff:
 * is the support-field legacy stamping still pending for this visual?
 * Pre-2.0 payloads with real project content qualify; fresh visuals,
 * cross-GUID imports and already-stamped payloads do not.
 */
export const isSupportFieldMigrationPending = (
    jsonSpec: string,
    denebMetaVersion: number
): boolean =>
    isStateManagementMigrationPending(
        SUPPORT_FIELD_LEGACY_MIGRATION_ID,
        denebMetaVersion,
        { hasProjectContent: hasProjectContent(jsonSpec) }
    );

/**
 * Apply all pending `'load-time'` migrations to a payload, in registry
 * order, and return the merged result plus everything the caller needs to
 * act on (pending data-dependent entries, corrupt-key signals).
 *
 * Guarantees:
 *
 *  - MERGE, never replace: each entry's patch is spread over the input;
 *    keys an entry does not touch are preserved verbatim.
 *  - Idempotent: running the pipeline on its own output (or on a stale
 *    sync-layer echo of it) applies nothing and returns a deep-equal
 *    payload.
 *  - `'empty-or-cross-guid'`, `'current'` and `'indeterminate'` payloads
 *    are no-ops.
 *  - A pending `'first-dataview'` entry blocks all later entries — they
 *    assume its output shape and run only after it has executed and
 *    stamped from the mapping pass.
 *  - The version stamp is only written when at least one entry applied.
 */
export const runStateManagementLoadTimeMigrations = (
    payload: Readonly<StateManagementPayload>,
    context: StateManagementMigrationContext,
    entries: readonly StateManagementMigrationEntry[] = STATE_MANAGEMENT_MIGRATIONS
): StateManagementLoadMigrationResult => {
    const { version, classification, corruptKeys } =
        inspectStateManagementPayload(payload, context, entries);
    const noOp = (v: number | null): StateManagementLoadMigrationResult => ({
        payload: { ...payload },
        version: v ?? 0,
        classification,
        applied: [],
        pendingFirstDataview: [],
        corruptKeys
    });
    if (
        classification === 'indeterminate' ||
        classification === 'current' ||
        classification === 'empty-or-cross-guid'
    ) {
        return noOp(version);
    }
    let migrated: StateManagementPayload = { ...payload };
    let workingVersion = version as number;
    const applied: string[] = [];
    const pendingFirstDataview: string[] = [];
    for (const entry of entries) {
        if (workingVersion >= entry.toVersion) {
            // Already migrated past this entry (idempotency / stale echo).
            continue;
        }
        // `requiresProjectContent` is primarily enforced by classification:
        // a project-less payload below the current version is
        // `'empty-or-cross-guid'` above and never reaches this loop. This
        // per-entry guard is the defensive backstop — it keeps the loop
        // honouring the flag if a future entry is ever reached with it set,
        // rather than relying solely on the earlier classification return.
        if (entry.requiresProjectContent && !context.hasProjectContent) {
            continue;
        }
        if (entry.migrationClass === 'first-dataview') {
            // Data-dependent: executes later from the mapping pass. Later
            // entries assume its output shape, so stop here.
            pendingFirstDataview.push(entry.id);
            break;
        }
        migrated = { ...migrated, ...entry.migrate(migrated) };
        workingVersion = entry.toVersion;
        applied.push(entry.id);
    }
    if (applied.length === 0) {
        return {
            payload: { ...payload },
            version: version as number,
            classification,
            applied,
            pendingFirstDataview,
            corruptKeys
        };
    }
    migrated = { ...migrated, denebMetaVersion: String(workingVersion) };
    return {
        payload: migrated,
        version: workingVersion,
        classification,
        applied,
        pendingFirstDataview,
        corruptKeys
    };
};
