import type { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import type { ProjectSliceProperties } from '@deneb-viz/app-core';
import type { PropertyChange } from '../persistence/types';

/**
 * Defines the mapping between a project slice property and its corresponding
 * Power BI visual setting for bidirectional synchronization.
 */
export type ProjectPropertyMapping<T> = {
    /** Key in ProjectSliceProperties (excludes internal/method properties) */
    projectKey: keyof Omit<
        ProjectSliceProperties,
        '__hasHydrated__' | 'syncProjectData'
    >;
    /** Extract the value from Power BI visual settings */
    getVisualValue: (settings: VisualFormattingSettingsModel) => T;
    /** Power BI object/property path for persistence */
    persistence: {
        objectName: string;
        propertyName: string;
    };
    /** Optional equality check (defaults to ===) */
    isEqual?: (a: T, b: T) => boolean;
    /**
     * Optional callback to generate additional property changes when this value
     * is persisted. Use this for side effects like resetting dependent properties.
     */
    onPersist?: (
        value: T,
        settings: VisualFormattingSettingsModel
    ) => PropertyChange[];
};

/**
 * Mappings for all project properties that need to be synchronized
 * between the app-core store and Power BI visual settings.
 *
 * Add new mappings here as project properties are added.
 */
export const PROJECT_SYNC_MAPPINGS: ProjectPropertyMapping<unknown>[] = [
    {
        projectKey: 'spec',
        getVisualValue: (s) => s.vega.output.jsonSpec.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonSpec'
        }
    },
    {
        projectKey: 'config',
        getVisualValue: (s) => s.vega.output.jsonConfig.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonConfig'
        }
    },
    {
        projectKey: 'logLevel',
        getVisualValue: (s) => s.vega.logging.logLevel.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'logLevel'
        }
    },
    {
        projectKey: 'provider',
        getVisualValue: (s) => s.vega.output.provider.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'provider'
        },
        onPersist: (provider, settings) => {
            const base: PropertyChange[] = [];
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
        projectKey: 'providerVersion',
        getVisualValue: (s) => s.vega.output.version.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'version'
        }
    },
    {
        projectKey: 'renderMode',
        getVisualValue: (s) => s.vega.output.renderMode.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'renderMode'
        }
    }
    // Add more mappings here as needed
];
