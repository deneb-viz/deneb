import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS_SETTINGS } from '@deneb-viz/vega-runtime/spec-processing';

import { getBindingsForCollapseSettings } from '../bindings';
import { createDenebState } from '../state';

describe('bindings slice', () => {
    it('starts with no held values', () => {
        expect(createDenebState().getState().bindings.heldValues).toEqual({});
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

    it('starts with no collapse choice and no collapse settings seen', () => {
        const { bindings } = createDenebState().getState();
        expect(bindings.paneCollapseChoice).toBeNull();
        expect(bindings.lastCollapseSettings).toBeNull();
    });

    it('records the collapse choice of the reader', () => {
        const store = createDenebState();
        store.getState().bindings.setPaneCollapseChoice(true);
        expect(store.getState().bindings.paneCollapseChoice).toBe(true);
        store.getState().bindings.setPaneCollapseChoice(false);
        expect(store.getState().bindings.paneCollapseChoice).toBe(false);
    });

    describe('getBindingsForCollapseSettings', () => {
        type CollapseSettings = { collapsible: boolean; collapsed: boolean };

        const bindingsWith = (
            lastCollapseSettings: CollapseSettings | null,
            paneCollapseChoice: boolean | null
        ) => ({
            ...createDenebState().getState().bindings,
            lastCollapseSettings,
            paneCollapseChoice
        });

        it('records the settings of the first spec that compiles', () => {
            const next = getBindingsForCollapseSettings(
                bindingsWith(null, null),
                { collapsible: true, collapsed: true }
            );
            expect(next.lastCollapseSettings).toEqual({
                collapsible: true,
                collapsed: true
            });
            expect(next.paneCollapseChoice).toBeNull();
        });

        it('records only the two collapse settings, in an object of its own', () => {
            const settings = {
                ...DEFAULT_BINDINGS_SETTINGS,
                collapsible: true,
                collapsed: true
            };
            const next = getBindingsForCollapseSettings(
                bindingsWith(null, null),
                settings
            );
            expect(next.lastCollapseSettings).toEqual({
                collapsible: true,
                collapsed: true
            });
            expect(next.lastCollapseSettings).not.toBe(settings);
        });

        it('returns the same state, with the choice, while the settings stay as they were', () => {
            const bindings = bindingsWith(
                { collapsible: true, collapsed: false },
                true
            );
            expect(
                getBindingsForCollapseSettings(bindings, {
                    collapsible: true,
                    collapsed: false
                })
            ).toBe(bindings);
        });

        it('returns the same state for a settings object with the same values but another identity', () => {
            const recorded = { collapsible: true, collapsed: false };
            const bindings = bindingsWith(recorded, true);
            const sameValues = { ...DEFAULT_BINDINGS_SETTINGS, ...recorded };
            expect(sameValues).not.toBe(recorded);
            expect(getBindingsForCollapseSettings(bindings, sameValues)).toBe(
                bindings
            );
        });

        it('clears the choice when the collapsed setting changes', () => {
            const next = getBindingsForCollapseSettings(
                bindingsWith({ collapsible: true, collapsed: false }, true),
                { collapsible: true, collapsed: true }
            );
            expect(next.lastCollapseSettings).toEqual({
                collapsible: true,
                collapsed: true
            });
            expect(next.paneCollapseChoice).toBeNull();
        });

        it('clears the choice when the collapsible setting changes alone', () => {
            const next = getBindingsForCollapseSettings(
                bindingsWith({ collapsible: true, collapsed: false }, true),
                { collapsible: false, collapsed: false }
            );
            expect(next.lastCollapseSettings).toEqual({
                collapsible: false,
                collapsed: false
            });
            expect(next.paneCollapseChoice).toBeNull();
        });

        it('does not bring an old choice back when the collapsed setting is changed and then changed back', () => {
            const changed = getBindingsForCollapseSettings(
                bindingsWith({ collapsible: true, collapsed: false }, true),
                { collapsible: true, collapsed: true }
            );
            const changedBack = getBindingsForCollapseSettings(changed, {
                collapsible: true,
                collapsed: false
            });
            expect(changedBack.lastCollapseSettings).toEqual({
                collapsible: true,
                collapsed: false
            });
            expect(changedBack.paneCollapseChoice).toBeNull();
        });

        it('does not bring an old choice back when the pane is made not collapsible and then collapsible again', () => {
            const turnedOff = getBindingsForCollapseSettings(
                bindingsWith({ collapsible: true, collapsed: false }, true),
                { collapsible: false, collapsed: false }
            );
            const turnedOn = getBindingsForCollapseSettings(turnedOff, {
                collapsible: true,
                collapsed: false
            });
            expect(turnedOn.lastCollapseSettings).toEqual({
                collapsible: true,
                collapsed: false
            });
            expect(turnedOn.paneCollapseChoice).toBeNull();
        });
    });
});
