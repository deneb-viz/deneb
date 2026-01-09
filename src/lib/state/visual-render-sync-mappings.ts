import type { VisualRenderSliceProperties } from '@deneb-viz/app-core';
import type { SliceSyncMapping } from './sync-types';

/**
 * Keys that can be synced from VisualRenderSliceProperties
 */
type VisualRenderPreferencesSyncKey = keyof VisualRenderSliceProperties;

/**
 * Mappings for all visual render preferences properties that need to be synchronized
 * between the app-core store and Power BI visual settings.
 *
 * Add new mappings here as editor preferences properties are added.
 */
export const VISUAL_RENDER_SYNC_MAPPINGS: SliceSyncMapping<VisualRenderPreferencesSyncKey>[] =
    [
        {
            sliceKey: 'scrollbarColor',
            getVisualValue: (s) =>
                s.display.scrollbars.scrollbarColor.value.value,
            persistence: {
                objectName: 'display',
                propertyName: 'scrollbarColor'
            }
        },
        {
            sliceKey: 'scrollbarOpacity',
            getVisualValue: (s) => s.display.scrollbars.scrollbarOpacity.value,
            persistence: {
                objectName: 'display',
                propertyName: 'scrollbarOpacity'
            }
        },
        {
            sliceKey: 'scrollbarRadius',
            getVisualValue: (s) => s.display.scrollbars.scrollbarRadius.value,
            persistence: {
                objectName: 'display',
                propertyName: 'scrollbarRadius'
            }
        },
        {
            sliceKey: 'scrollEventThrottle',
            getVisualValue: (s) =>
                s.display.scrollEvents.scrollEventThrottle.value,
            persistence: {
                objectName: 'display',
                propertyName: 'scrollEventThrottle'
            }
        }
        // Add more mappings here as needed
    ];
