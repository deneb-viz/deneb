import type { EditorPreferencesSliceProperties } from '@deneb-viz/app-core';
import { getVisualSettings } from '../../app/visual-settings';
import type { SliceSyncMapping } from './sync-types';

/**
 * Keys that can be synced from EditorPreferencesSliceProperties
 */
type EditorPreferencesSyncKey = keyof EditorPreferencesSliceProperties;

/**
 * Mappings for all editor preferences properties that need to be synchronized
 * between the app-core store and Power BI visual settings.
 *
 * Add new mappings here as editor preferences properties are added.
 */
export const EDITOR_PREFERENCES_SYNC_MAPPINGS: SliceSyncMapping<EditorPreferencesSyncKey>[] =
    [
        {
            sliceKey: 'dataViewerRowsPerPage',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.debugPane.debugTableRowsPerPage
                    .value.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'debugTableRowsPerPage'
            }
        },
        {
            sliceKey: 'jsonEditorDebouncePeriod',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.debouncePeriod.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'debouncePeriod'
            }
        },
        {
            sliceKey: 'jsonEditorFontSize',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.fontSize.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'fontSize'
            }
        },
        {
            sliceKey: 'jsonEditorFormattingMaxLineLength',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.formattingMaxLineLength.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'formattingMaxLineLength'
            }
        },
        {
            sliceKey: 'jsonEditorPosition',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.position.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'editorPosition'
            }
        },
        {
            sliceKey: 'jsonEditorShowLineNumbers',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.showLineNumbers.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'showLineNumbers'
            }
        },
        {
            sliceKey: 'jsonEditorWordWrap',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.json.wordWrap.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'wordWrap'
            }
        },
        {
            sliceKey: 'previewAreaShowBorder',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.preview.showViewportMarker.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaShowBorder'
            }
        },
        {
            sliceKey: 'previewAreaShowScrollbarsOnOverflow',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.preview.previewScrollbars.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaShowScrollbarsOnOverflow'
            }
        },
        {
            sliceKey: 'previewAreaTransparentBackground',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.preview.backgroundPassThrough.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaTransparentBackground'
            }
        },
        {
            sliceKey: 'theme',
            getVisualValue: (s) =>
                getVisualSettings(s).editor.interface.theme.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'theme'
            }
        }
        // Add more mappings here as needed
    ];
