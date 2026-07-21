import { StateCreator } from 'zustand';
import { type StoreState } from './state';

/**
 * Session-only state for the settings pane's search UI and accordion
 * open/close model.
 *
 * Both `query` and `openItems` live on the Zustand store (module
 * singleton) so they survive component remount within a single visual
 * session. `openItems` was previously a module-level ref in
 * `settings-pane.tsx`; moving it here removes the cross-remount leak
 * that surfaced during code review (P2 #5). Neither is persisted across
 * reloads — this slice is not part of `SyncableSlice` and has no wiring
 * into project persistence.
 */
export type SettingsPaneSliceProperties = {
    /** Current search query string. `''` means no filter active. */
    query: string;
    /** Ids of currently-open accordion sections (Fluent `Accordion.openItems`). */
    openItems: string[];
    /** Replace the current query. */
    setQuery: (query: string) => void;
    /** Clear the current query (equivalent to `setQuery('')`). */
    clearQuery: () => void;
    /** Replace the set of open accordion section ids. */
    setOpenItems: (items: string[]) => void;
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
            openItems: [],
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
                ),
            setOpenItems: (items) =>
                set(
                    (state) => ({
                        settingsPane: {
                            ...state.settingsPane,
                            openItems: items
                        }
                    }),
                    false,
                    'settingsPane.setOpenItems'
                )
        }
    });
