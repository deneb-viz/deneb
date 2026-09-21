import type { HostSettingsModel } from '../../lib/persistence';
import type { PropertyChange } from '../persistence/types';

/**
 * Maximum time (ms) to wait for Power BI to confirm a persisted value before clearing the pending entry and
 * allowing inbound sync to resume. Acts as a safety net for silent persist failures.
 */
export const PENDING_PERSIST_TIMEOUT_MS = 5000;

/**
 * Tracks a value that has been persisted to Power BI but not yet confirmed by an incoming visual update.
 */
export type PendingPersistEntry = {
    /** The raw app-core value that was persisted (not the serialized form). */
    value: unknown;
    /** Timestamp (Date.now()) when the persist was initiated. */
    timestamp: number;
};

/**
 * Generic mapping between a slice property and its corresponding Power BI visual setting for bidirectional
 * synchronization.
 */
export type SliceSyncMapping<TSliceKey extends string> = {
    /** Key in the slice properties (excludes internal/method properties) */
    sliceKey: TSliceKey;
    /** Extract the value from Power BI visual settings */
    getVisualValue: (settings: HostSettingsModel) => unknown;
    /**
     * Power BI object/property path for persistence.
     * Optional for properties that are read-only from Power BI settings (e.g., composite objects like interactivity).
     */
    persistence?: {
        objectName: string;
        propertyName: string;
    };
    /**
     * Optional callback to transform the app-core value into the form required by Power BI storage before
     * creating the PropertyChange. Use this for properties that need serialization (e.g., JSON.stringify for
     * objects, String() for numbers stored as text). Replaces the primary PropertyChange value — only one
     * entry per mapping is pushed.
     */
    serializeForPersistence?: (value: unknown) => unknown;
    /**
     * Optional callback to generate additional property changes when this value is persisted. Use this for
     * cross-property side effects like resetting dependent properties (e.g., provider change resets selectionMode).
     * Not for self-referencing serialization — use serializeForPersistence instead.
     */
    onPersist?: (
        value: unknown,
        settings: HostSettingsModel
    ) => PropertyChange[];
};

/**
 * Configuration for synchronizing a slice with Power BI visual settings.
 */
export type SliceSyncConfig<TSlice, TSliceKey extends string, TSyncPayload> = {
    /** Name for logging purposes */
    name: string;
    /** Get the slice from app-core state */
    getSlice: (state: unknown) => TSlice;
    /** Get the sync function from the slice */
    getSyncFn: (slice: TSlice) => (payload: TSyncPayload) => void;
    /** Check if the slice has been hydrated */
    isHydrated: (slice: TSlice) => boolean;
    /** Get a property value from the slice */
    getSliceValue: (slice: TSlice, key: TSliceKey) => unknown;
    /** Property mappings for this slice */
    mappings: SliceSyncMapping<TSliceKey>[];
};

/**
 * A `SliceSyncConfig` with its slice/key/payload type parameters erased, so
 * definitions targeting different app-core slices can share a single array
 * (e.g. the contributions accepted by `initializeStoreSynchronization`).
 */
export type SliceSyncDefinition = SliceSyncConfig<any, string, any>;

/**
 * Identity helper that types a slice-sync definition against its own
 * `TSlice`/`TSliceKey`/`TSyncPayload` before erasing them to `SliceSyncDefinition`.
 *
 * Assigning an object literal directly to a `SliceSyncDefinition[]`-typed array
 * (or to the erased `SliceSyncDefinition` type) widens every field to `any`
 * immediately, so `getSlice`'s return type no longer constrains `getSyncFn`,
 * `isHydrated`, or `getSliceValue` — a typo like `slice.nonExistentMethod`
 * inside `getSyncFn` compiles silently. Passing the literal through this
 * generic function instead lets TypeScript infer `TSlice` from `getSlice`
 * before erasure, so the other fields are checked against it.
 */
export const defineSliceSync = <TSlice, TSliceKey extends string, TSyncPayload>(
    config: SliceSyncConfig<TSlice, TSliceKey, TSyncPayload>
): SliceSyncDefinition => config;
