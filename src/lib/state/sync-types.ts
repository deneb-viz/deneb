import type { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import type { PropertyChange } from '../persistence/types';

/**
 * Generic mapping between a slice property and its corresponding
 * Power BI visual setting for bidirectional synchronization.
 */
export type SliceSyncMapping<TSliceKey extends string> = {
    /** Key in the slice properties (excludes internal/method properties) */
    sliceKey: TSliceKey;
    /** Extract the value from Power BI visual settings */
    getVisualValue: (settings: VisualFormattingSettingsModel) => unknown;
    /** Power BI object/property path for persistence */
    persistence: {
        objectName: string;
        propertyName: string;
    };
    /**
     * Optional callback to generate additional property changes when this value
     * is persisted. Use this for side effects like resetting dependent properties.
     */
    onPersist?: (
        value: unknown,
        settings: VisualFormattingSettingsModel
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
