/**
 * Configuration limits for incremental data updates.
 * Controls the SpinButton behavior and validation for the threshold setting.
 *
 * Separated from compilation.ts to avoid pulling in schema dependencies
 * when only this configuration object is needed (e.g. viewer-only builds).
 */
export const INCREMENTAL_UPDATE_CONFIGURATION = {
    /** Whether incremental updates are enabled by default */
    enabledDefault: false,
    /** Minimum allowed threshold value */
    minThreshold: 5,
    /** Maximum allowed threshold value (hard limit based on Vega changeset performance) */
    maxThreshold: 5000,
    /** Default threshold value */
    defaultThreshold: 500,
    /** Step increment for the SpinButton */
    stepValue: 5
};
