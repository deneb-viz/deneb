import { describe, expect, it } from 'vitest';

import { getBindingsForCollapsedSetting } from '../bindings';
import { createDenebState } from '../state';

describe('bindings slice', () => {
    it('starts with no held values and an expanded pane', () => {
        const { bindings } = createDenebState().getState();
        expect(bindings.heldValues).toEqual({});
        expect(bindings.isPaneCollapsed).toBe(false);
    });

    it('holds a value under its signal name', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        store.getState().bindings.setHeldValue('b', { key: 'k', value: null });
        expect(store.getState().bindings.heldValues).toEqual({
            a: { key: 'k', value: 1 },
            b: { key: 'k', value: null }
        });
    });

    it('replaces a held value when the value or the definition key changes', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 2 });
        expect(store.getState().bindings.heldValues.a).toEqual({
            key: 'k',
            value: 2
        });
        store.getState().bindings.setHeldValue('a', { key: 'other', value: 2 });
        expect(store.getState().bindings.heldValues.a.key).toBe('other');
    });

    it('keeps the same state object when an identical value is held again', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        const before = store.getState().bindings;
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        expect(store.getState().bindings).toBe(before);
    });

    it('records whether the pane is collapsed', () => {
        const store = createDenebState();
        store.getState().bindings.setIsPaneCollapsed(true);
        expect(store.getState().bindings.isPaneCollapsed).toBe(true);
        store.getState().bindings.setIsPaneCollapsed(false);
        expect(store.getState().bindings.isPaneCollapsed).toBe(false);
    });

    it('starts with no collapse choice and no collapsed setting seen', () => {
        const { bindings } = createDenebState().getState();
        expect(bindings.paneCollapseChoice).toBeNull();
        expect(bindings.lastCollapsedSetting).toBeNull();
    });

    it('records the collapse choice of the reader', () => {
        const store = createDenebState();
        store.getState().bindings.setPaneCollapseChoice(true);
        expect(store.getState().bindings.paneCollapseChoice).toBe(true);
        store.getState().bindings.setPaneCollapseChoice(false);
        expect(store.getState().bindings.paneCollapseChoice).toBe(false);
    });

    describe('getBindingsForCollapsedSetting', () => {
        const bindingsWith = (
            lastCollapsedSetting: boolean | null,
            paneCollapseChoice: boolean | null
        ) => ({
            ...createDenebState().getState().bindings,
            lastCollapsedSetting,
            paneCollapseChoice
        });

        it('records the setting of the first spec that compiles', () => {
            const next = getBindingsForCollapsedSetting(
                bindingsWith(null, null),
                true
            );
            expect(next.lastCollapsedSetting).toBe(true);
            expect(next.paneCollapseChoice).toBeNull();
        });

        it('returns the same state, with the choice, while the setting stays as it was', () => {
            const bindings = bindingsWith(false, true);
            expect(getBindingsForCollapsedSetting(bindings, false)).toBe(
                bindings
            );
        });

        it('clears the choice when the setting changes', () => {
            const next = getBindingsForCollapsedSetting(
                bindingsWith(false, true),
                true
            );
            expect(next.lastCollapsedSetting).toBe(true);
            expect(next.paneCollapseChoice).toBeNull();
        });

        it('does not bring an old choice back when the setting is changed and then changed back', () => {
            const changed = getBindingsForCollapsedSetting(
                bindingsWith(false, true),
                true
            );
            const changedBack = getBindingsForCollapsedSetting(changed, false);
            expect(changedBack.lastCollapsedSetting).toBe(false);
            expect(changedBack.paneCollapseChoice).toBeNull();
        });
    });
});
