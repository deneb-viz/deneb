import { type OnCreateProjectPayload } from '@deneb-viz/app-core';
import { logWarning } from '@deneb-viz/utils/logging';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import {
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';

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
        persistProperties(
            resolveObjectProperties([
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
                        {
                            name: 'enableContextMenu',
                            value: metadata?.interactivity?.contextMenu ?? false
                        },
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
                                DEFAULTS.vega.selectionMaxDataPoints
                        },
                        {
                            name: 'selectionMode',
                            value:
                                metadata?.interactivity?.selectionMode ??
                                (DEFAULTS.vega.selectionMode as SelectionMode)
                        }
                    ]
                }
            ])
        );
    } catch (error) {
        logWarning(
            'Failed to persist project settings from template:',
            error instanceof Error ? error.message : String(error)
        );
    }
};
