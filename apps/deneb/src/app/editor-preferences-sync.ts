import {
    getDenebState,
    type EditorPreferencesSliceProperties
} from '@deneb-viz/app-core';
import { getVisualSettings } from './visual-settings';
import type { SliceSyncMapping, SliceSyncConfig } from '../host';

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
const EDITOR_PREFERENCES_SYNC_MAPPINGS: SliceSyncMapping<EditorPreferencesSyncKey>[] =
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

/**
 * Slice-sync definition for editor preferences, contributed to
 * `initializeStoreSynchronization` alongside the generic slice syncs.
 */
export const editorPreferencesSync: SliceSyncConfig<
    ReturnType<typeof getDenebState>['editorPreferences'],
    EditorPreferencesSyncKey,
    EditorPreferencesSliceProperties
> = {
    name: 'editorPreferences',
    getSlice: (state) =>
        (state as ReturnType<typeof getDenebState>).editorPreferences,
    getSyncFn: (slice) => slice.syncPreferences,
    isHydrated: (slice) => slice.__hasHydrated__,
    getSliceValue: (slice, key) => slice[key as keyof typeof slice],
    mappings: EDITOR_PREFERENCES_SYNC_MAPPINGS
};
