import type { CompilationSliceProperties } from '@deneb-viz/app-core';
import type { SliceSyncMapping } from './sync-types';

/**
 * Keys that can be synced from CompilationSliceProperties (performance settings only)
 */
type CompilationPerformanceSyncKey = keyof Pick<
    CompilationSliceProperties,
    'enableIncrementalDataUpdates' | 'incrementalUpdateThreshold'
>;

/**
 * Mappings for compilation performance settings that need to be synchronized between the app-core store and Power BI
 * visual settings.
 */
export const COMPILATION_SYNC_MAPPINGS: SliceSyncMapping<CompilationPerformanceSyncKey>[] =
    [
        {
            sliceKey: 'enableIncrementalDataUpdates',
            getVisualValue: (s) =>
                s.dataLimit.performance.enableIncrementalDataUpdates.value,
            persistence: {
                objectName: 'dataLimit',
                propertyName: 'enableIncrementalDataUpdates'
            }
        },
        {
            sliceKey: 'incrementalUpdateThreshold',
            getVisualValue: (s) =>
                s.dataLimit.performance.incrementalUpdateThreshold.value,
            persistence: {
                objectName: 'dataLimit',
                propertyName: 'incrementalUpdateThreshold'
            }
        }
    ];
