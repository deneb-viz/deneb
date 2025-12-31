import { type StateCreator } from 'zustand';
import { type SyncableSlice, type StoreState } from './state';
import { type EditorPanePosition, type DenebTheme } from '../lib';
import {
    DATA_VIEWER_CONFIGURATION,
    EDITOR_DEFAULTS
} from '@deneb-viz/configuration';

export type EditorPreferencesSliceProperties = {
    dataViewerRowsPerPage: number;
    jsonEditorDebouncePeriod: number;
    jsonEditorFontSize: number;
    jsonEditorPosition: EditorPanePosition;
    jsonEditorShowLineNumbers: boolean;
    jsonEditorWordWrap: boolean;
    previewAreaShowBorder: boolean;
    previewAreaShowScrollbarsOnOverflow: boolean;
    previewAreaTransparentBackground: boolean;
    theme: DenebTheme;
};

export type EditorPreferencesSlice = {
    editorPreferences: SyncableSlice &
        EditorPreferencesSliceProperties & {
            setDataViewerRowsPerPage: (rowsPerPage: number) => void;
            setJsonEditorPosition: (position: EditorPanePosition) => void;
            setTheme: (theme: DenebTheme) => void;
            syncPreferences: (payload: EditorPreferencesSyncPayload) => void;
        };
};

export type EditorPreferencesSyncPayload = EditorPreferencesSliceProperties;

export const createEditorPreferencesSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        EditorPreferencesSlice
    > =>
    (set) => ({
        editorPreferences: {
            __hasHydrated__: false,
            dataViewerRowsPerPage:
                DATA_VIEWER_CONFIGURATION.rowsPerPage.default,
            jsonEditorDebouncePeriod: EDITOR_DEFAULTS.debouncePeriod.default,
            jsonEditorFontSize: EDITOR_DEFAULTS.fontSize.default,
            jsonEditorPosition: EDITOR_DEFAULTS.position as EditorPanePosition,
            jsonEditorShowLineNumbers: EDITOR_DEFAULTS.showLineNumbers,
            jsonEditorWordWrap: EDITOR_DEFAULTS.wordWrap,
            previewAreaShowBorder: EDITOR_DEFAULTS.previewAreaShowBorder,
            previewAreaShowScrollbarsOnOverflow:
                EDITOR_DEFAULTS.previewAreaShowScrollbarsOnOverflow,
            previewAreaTransparentBackground:
                EDITOR_DEFAULTS.previewAreaTransparentBackground,
            theme: EDITOR_DEFAULTS.theme as DenebTheme,
            setDataViewerRowsPerPage: (rowsPerPage: number) => {
                set((state) => ({
                    editorPreferences: {
                        ...state.editorPreferences,
                        dataViewerRowsPerPage: rowsPerPage
                    }
                }));
            },
            setJsonEditorPosition: (position: EditorPanePosition) => {
                set((state) => ({
                    editorPreferences: {
                        ...state.editorPreferences,
                        jsonEditorPosition: position
                    }
                }));
            },
            setTheme: (theme: DenebTheme) => {
                set((state) => ({
                    editorPreferences: {
                        ...state.editorPreferences,
                        theme
                    }
                }));
            },
            syncPreferences: (payload: EditorPreferencesSyncPayload) => {
                set((state) => handleSyncPreferences(state, payload), false, {
                    type: 'editorPreferences.syncPreferences'
                });
            }
        }
    });

const handleSyncPreferences = (
    state: StoreState,
    payload: EditorPreferencesSyncPayload
): Partial<StoreState> => {
    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    return {
        editorPreferences: {
            ...state.editorPreferences,
            ...definedPayload,
            __hasHydrated__: true
        }
    };
};
