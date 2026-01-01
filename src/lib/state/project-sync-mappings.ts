import type { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import type { ProjectSliceProperties } from '@deneb-viz/app-core';
import type { SliceSyncMapping } from './sync-types';
import type { SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import type { UsermetaInteractivity } from '@deneb-viz/template-usermeta';

/**
 * Keys that can be synced from ProjectSliceProperties
 * (excludes internal flags and methods)
 */
type ProjectSyncKey = keyof Omit<
    ProjectSliceProperties,
    | '__hasHydrated__'
    | '__isInitialized__'
    | 'syncProjectData'
    | 'setLogLevel'
    | 'setProvider'
    | 'setRenderMode'
>;

/**
 * Helper to extract interactivity object from visual settings.
 */
const getInteractivityFromSettings = (
    s: VisualFormattingSettingsModel
): UsermetaInteractivity => ({
    tooltip: s.vega.interactivity.enableTooltips.value,
    contextMenu: s.vega.interactivity.enableContextMenu.value,
    selection: s.vega.interactivity.enableSelection.value,
    selectionMode: s.vega.interactivity.selectionMode.value as SelectionMode,
    highlight: s.vega.interactivity.enableHighlight.value,
    dataPointLimit: s.vega.interactivity.selectionMaxDataPoints.value
});

/**
 * Mappings for all project properties that need to be synchronized
 * between the app-core store and Power BI visual settings.
 *
 * Add new mappings here as project properties are added.
 */
export const PROJECT_SYNC_MAPPINGS: SliceSyncMapping<ProjectSyncKey>[] = [
    {
        sliceKey: 'spec',
        getVisualValue: (s) => s.vega.output.jsonSpec.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonSpec'
        }
    },
    {
        sliceKey: 'config',
        getVisualValue: (s) => s.vega.output.jsonConfig.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonConfig'
        }
    },
    {
        sliceKey: 'logLevel',
        getVisualValue: (s) => s.vega.logging.logLevel.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'logLevel'
        }
    },
    {
        sliceKey: 'provider',
        getVisualValue: (s) => s.vega.output.provider.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'provider'
        },
        onPersist: (provider, settings) => {
            // Reset selectionMode to 'simple' if switching to vegaLite
            // (vegaLite doesn't support 'advanced' selection mode)
            if (
                provider === 'vegaLite' &&
                settings.vega.interactivity.selectionMode.value !== 'simple'
            ) {
                return [
                    {
                        objectName: 'vega',
                        propertyName: 'selectionMode',
                        value: 'simple'
                    }
                ];
            }
            return [];
        }
    },
    {
        sliceKey: 'providerVersion',
        getVisualValue: (s) => s.vega.output.version.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'version'
        }
    },
    {
        sliceKey: 'renderMode',
        getVisualValue: (s) => s.vega.output.renderMode.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'renderMode'
        }
    },
    {
        sliceKey: 'interactivity',
        getVisualValue: getInteractivityFromSettings
        // Note: interactivity persistence is handled separately per-property
        // since it's an object composed of multiple visual settings properties.
        // Changes to interactivity come from the Power BI side only.
    }
];
