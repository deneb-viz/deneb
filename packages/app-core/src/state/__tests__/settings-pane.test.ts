import { describe, expect, it, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
    createSettingsPaneSlice,
    type SettingsPaneSlice
} from '../settings-pane';

/**
 * Build a standalone store exposing only the settings-pane slice so tests
 * can exercise its actions without spinning up the full `StoreState`.
 */
const makeStore = () =>
    create<SettingsPaneSlice>()((set, get, api) =>
        // The slice factory is typed against StoreState + devtools mutator;
        // cast the call-site params so it composes cleanly with a minimal
        // store. Behaviour of the slice itself is unchanged.
        createSettingsPaneSlice()(set as never, get as never, api as never)
    );

describe('settingsPane slice', () => {
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
        store = makeStore();
    });

    it('defaults query to an empty string', () => {
        expect(store.getState().settingsPane.query).toBe('');
    });

    it('setQuery updates query to the provided value', () => {
        store.getState().settingsPane.setQuery('foo');
        expect(store.getState().settingsPane.query).toBe('foo');
    });

    it('clearQuery resets query to the empty string', () => {
        store.getState().settingsPane.setQuery('foo');
        store.getState().settingsPane.clearQuery();
        expect(store.getState().settingsPane.query).toBe('');
    });

    it('setting the same query twice leaves the state consistent (idempotent)', () => {
        store.getState().settingsPane.setQuery('foo');
        store.getState().settingsPane.setQuery('foo');
        expect(store.getState().settingsPane.query).toBe('foo');
    });

    it('preserves store identity across updates (module-singleton simulation)', () => {
        // Zustand stores outlive the React component trees that subscribe
        // to them. This is how the "survives remount within a session"
        // contract is met: same store instance, same state, regardless
        // of how many times `<SettingsPane>` mounts and unmounts.
        const firstRef = store.getState().settingsPane;
        store.getState().settingsPane.setQuery('foo');
        // Simulate a component remount: nothing about the store changes.
        const secondRef = store.getState().settingsPane;
        expect(secondRef.query).toBe('foo');
        // Action identities are stable across updates.
        expect(secondRef.setQuery).toBe(firstRef.setQuery);
    });
});
