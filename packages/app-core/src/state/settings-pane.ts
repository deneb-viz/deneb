import { StateCreator } from 'zustand';
import { type StoreState } from './state';

/**
 * Minimal session-only state for the settings pane's search UI.
 *
 * The slice owns only the query string so closing and reopening the pane
 * within a visual session restores the last search term. Accordion
 * `openItems` stays local to `settings-pane.tsx` via its existing
 * `useState` + module-level `persistedOpenItems` pattern.
 */
export type SettingsPaneSliceProperties = {
    /** Current search query string. `''` means no filter active. */
    query: string;
    /** Replace the current query. */
    setQuery: (query: string) => void;
    /** Clear the current query (equivalent to `setQuery('')`). */
    clearQuery: () => void;
};

export type SettingsPaneSlice = {
    settingsPane: SettingsPaneSliceProperties;
};

export const createSettingsPaneSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        SettingsPaneSlice
    > =>
    (set) => ({
        settingsPane: {
            query: '',
            setQuery: (query) =>
                set(
                    (state) => ({
                        settingsPane: { ...state.settingsPane, query }
                    }),
                    false,
                    'settingsPane.setQuery'
                ),
            clearQuery: () =>
                set(
                    (state) => ({
                        settingsPane: { ...state.settingsPane, query: '' }
                    }),
                    false,
                    'settingsPane.clearQuery'
                )
        }
    });
