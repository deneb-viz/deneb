import { describe, expect, it } from 'vitest';

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
});
