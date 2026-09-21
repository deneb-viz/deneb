import powerbi from 'powerbi-visuals-api';

/**
 * Feature flags passed from the host (index.ts) to control dataset processing.
 * These are sourced from the app configuration and threaded through the
 * processing chain rather than being imported directly.
 */
export type HostFeatureFlags = {
    dataDrilldown: boolean;
};

/**
 * Used to store interim data whilst the data view is being processed
 */
export type AugmentedMetadataField = {
    // Power BI data view metadata.
    column: powerbi.DataViewMetadataColumn;
    // Where we have derived the metadata from.
    source: DatasetFieldValueSource;
    // Array index we can use to re-point to the data view (if needed).
    sourceIndex: number;
    // Pre-encoded field name to avoid repeated computation during row mapping.
    encodedName?: string;
};

/**
 * Indicates where in the data view we obtain a value from.
 */
export type DatasetFieldValueSource =
    | 'categories'
    | 'values'
    | 'highlights'
    | 'formatting'
    | 'none';
