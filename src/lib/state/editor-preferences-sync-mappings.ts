import type { EditorPreferencesSliceProperties } from '@deneb-viz/app-core';
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
                s.editor.debugPane.debugTableRowsPerPage.value.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'debugTableRowsPerPage'
            }
        },
        {
            sliceKey: 'jsonEditorDebouncePeriod',
            getVisualValue: (s) => s.editor.json.debouncePeriod.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'debouncePeriod'
            }
        },
        {
            sliceKey: 'jsonEditorFontSize',
            getVisualValue: (s) => s.editor.json.fontSize.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'fontSize'
            }
        },
        {
            sliceKey: 'jsonEditorPosition',
            getVisualValue: (s) => s.editor.json.position.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'editorPosition'
            }
        },
        {
            sliceKey: 'jsonEditorShowLineNumbers',
            getVisualValue: (s) => s.editor.json.showLineNumbers.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'showLineNumbers'
            }
        },
        {
            sliceKey: 'jsonEditorWordWrap',
            getVisualValue: (s) => s.editor.json.wordWrap.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'wordWrap'
            }
        },
        {
            sliceKey: 'previewAreaShowBorder',
            getVisualValue: (s) => s.editor.preview.showViewportMarker.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaShowBorder'
            }
        },
        {
            sliceKey: 'previewAreaShowScrollbarsOnOverflow',
            getVisualValue: (s) => s.editor.preview.previewScrollbars.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaShowScrollbarsOnOverflow'
            }
        },
        {
            sliceKey: 'previewAreaTransparentBackground',
            getVisualValue: (s) => s.editor.preview.backgroundPassThrough.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'previewAreaTransparentBackground'
            }
        },
        {
            sliceKey: 'theme',
            getVisualValue: (s) => s.editor.interface.theme.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'theme'
            }
        }
        // Add more mappings here as needed
    ];
