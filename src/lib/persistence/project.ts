import { type OnCreateProjectPayload } from '@deneb-viz/app-core';
import { logWarning } from '@deneb-viz/utils/logging';
import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';
import {
    persistProperties,
    resolveObjectProperties
} from '../../lib/persistence';
import { resolveContextMenuProperties } from './context-menu-migration';

/**
 * Persists all project and interactivity settings to Power BI properties when creating from a template.
 * This is the Power BI-specific implementation of the onCreateProject callback.
 * Called BEFORE app-core state is updated to ensure Power BI is the source of truth.
 */
export const persistOnCreateFromTemplate = async (
    payload: OnCreateProjectPayload
): Promise<void> => {
    const { metadata, spec, config } = payload;
    try {
        const objects: Parameters<typeof resolveObjectProperties>[0] = [
            {
                objectName: 'vega',
                properties: [
                    // Project properties
                    {
                        name: 'provider',
                        value: metadata.deneb.provider
                    },
                    {
                        name: 'jsonSpec',
                        value: spec
                    },
                    {
                        name: 'jsonConfig',
                        value: config
                    },
                    // Interactivity properties
                    {
                        name: 'enableTooltips',
                        value: metadata?.interactivity?.tooltip ?? false
                    },
                    ...resolveContextMenuProperties(metadata?.interactivity),
                    {
                        name: 'enableHighlight',
                        value: metadata?.interactivity?.highlight ?? false
                    },
                    {
                        name: 'enableSelection',
                        value: metadata?.interactivity?.selection ?? false
                    },
                    {
                        name: 'selectionMaxDataPoints',
                        value:
                            metadata?.interactivity?.dataPointLimit ??
                            INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
                    },
                    {
                        name: 'selectionMode',
                        value:
                            metadata?.interactivity?.selectionMode ??
                            INTERACTIVITY_DEFAULTS.selectionMode
                    }
                ]
            }
        ];
        // Persist support field configuration when provided by the template.
        // The value has already been remapped from placeholders to actual field names
        // by the time this callback is invoked, so we serialise it directly.
        if (
            metadata.supportFieldConfiguration &&
            Object.keys(metadata.supportFieldConfiguration).length > 0
        ) {
            objects.push({
                objectName: 'stateManagement',
                properties: [
                    {
                        name: 'supportFieldConfiguration',
                        value: JSON.stringify(
                            metadata.supportFieldConfiguration
                        )
                    }
                ]
            });
        }
        persistProperties(resolveObjectProperties(objects));
    } catch (error) {
        logWarning(
            'Failed to persist project settings from template:',
            error instanceof Error ? error.message : String(error)
        );
    }
};
