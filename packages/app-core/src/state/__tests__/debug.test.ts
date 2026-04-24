import { describe, expect, it, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createDebugSlice, type DebugSlice } from '../debug';

/**
 * Build a standalone store exposing only the debug slice so tests can
 * exercise its actions without spinning up the full `StoreState`.
 */
const makeStore = () =>
    create<DebugSlice>()((set, get, api) =>
        // The slice factory is typed against StoreState + devtools mutator;
        // cast the call-site params so it composes cleanly with a minimal
        // store. Behaviour of the slice itself is unchanged.
        createDebugSlice()(set as never, get as never, api as never)
    );

describe('debug slice', () => {
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
        store = makeStore();
    });

    describe('defaults', () => {
        it('defaults datasetName to an empty string', () => {
            expect(store.getState().debug.datasetName).toBe('');
        });

        it('defaults logAttention to false', () => {
            expect(store.getState().debug.logAttention).toBe(false);
        });

        it('defaults dataPivotSort to null for both tabs', () => {
            expect(store.getState().debug.dataPivotSort).toEqual({
                source: null,
                data: null
            });
        });

        it('defaults dataPivotPage to 1 for both tabs', () => {
            expect(store.getState().debug.dataPivotPage).toEqual({
                source: 1,
                data: 1
            });
        });
    });

    describe('setDatasetName', () => {
        it('updates datasetName to the provided value', () => {
            store.getState().debug.setDatasetName('customers');
            expect(store.getState().debug.datasetName).toBe('customers');
        });

        it('leaves dataPivotSort and dataPivotPage untouched', () => {
            // Seed widened fields so we can detect any clobber.
            store
                .getState()
                .debug.setDataTabSort({ colId: 'value', asc: false });
            store.getState().debug.setSourceTabPage(3);

            store.getState().debug.setDatasetName('customers');

            expect(store.getState().debug.dataPivotSort.data).toEqual({
                colId: 'value',
                asc: false
            });
            expect(store.getState().debug.dataPivotPage.source).toBe(3);
        });
    });

    describe('setDataTabSort', () => {
        it('updates dataPivotSort.data with the provided value', () => {
            store.getState().debug.setDataTabSort({ colId: 'foo', asc: true });
            expect(store.getState().debug.dataPivotSort.data).toEqual({
                colId: 'foo',
                asc: true
            });
        });

        it('does not mutate dataPivotSort.source', () => {
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: true });
            store.getState().debug.setDataTabSort({ colId: 'foo', asc: false });
            expect(store.getState().debug.dataPivotSort.source).toEqual({
                colId: 'category',
                asc: true
            });
        });

        it('accepts null to clear the data-tab sort without affecting source', () => {
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: true });
            store.getState().debug.setDataTabSort({ colId: 'foo', asc: true });
            store.getState().debug.setDataTabSort(null);
            expect(store.getState().debug.dataPivotSort.data).toBeNull();
            expect(store.getState().debug.dataPivotSort.source).toEqual({
                colId: 'category',
                asc: true
            });
        });
    });

    describe('setSourceTabSort', () => {
        it('updates dataPivotSort.source with the provided value', () => {
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: false });
            expect(store.getState().debug.dataPivotSort.source).toEqual({
                colId: 'category',
                asc: false
            });
        });

        it('does not mutate dataPivotSort.data', () => {
            store
                .getState()
                .debug.setDataTabSort({ colId: 'value', asc: false });
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: true });
            expect(store.getState().debug.dataPivotSort.data).toEqual({
                colId: 'value',
                asc: false
            });
        });

        it('accepts null to clear the source-tab sort without affecting data', () => {
            store
                .getState()
                .debug.setDataTabSort({ colId: 'value', asc: false });
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: true });
            store.getState().debug.setSourceTabSort(null);
            expect(store.getState().debug.dataPivotSort.source).toBeNull();
            expect(store.getState().debug.dataPivotSort.data).toEqual({
                colId: 'value',
                asc: false
            });
        });
    });

    describe('setDataTabPage', () => {
        it('updates dataPivotPage.data with the provided value', () => {
            store.getState().debug.setDataTabPage(5);
            expect(store.getState().debug.dataPivotPage.data).toBe(5);
        });

        it('does not mutate dataPivotPage.source', () => {
            store.getState().debug.setSourceTabPage(7);
            store.getState().debug.setDataTabPage(5);
            expect(store.getState().debug.dataPivotPage.source).toBe(7);
        });
    });

    describe('setSourceTabPage', () => {
        it('updates dataPivotPage.source with the provided value', () => {
            store.getState().debug.setSourceTabPage(4);
            expect(store.getState().debug.dataPivotPage.source).toBe(4);
        });

        it('does not mutate dataPivotPage.data', () => {
            store.getState().debug.setDataTabPage(2);
            store.getState().debug.setSourceTabPage(4);
            expect(store.getState().debug.dataPivotPage.data).toBe(2);
        });
    });

    describe('coexistence of per-tab state', () => {
        it('retains both sort values after setDataTabSort + setSourceTabSort', () => {
            store
                .getState()
                .debug.setDataTabSort({ colId: 'value', asc: false });
            store
                .getState()
                .debug.setSourceTabSort({ colId: 'category', asc: true });
            expect(store.getState().debug.dataPivotSort).toEqual({
                source: { colId: 'category', asc: true },
                data: { colId: 'value', asc: false }
            });
        });

        it('retains both page values after setDataTabPage + setSourceTabPage', () => {
            store.getState().debug.setSourceTabPage(3);
            store.getState().debug.setDataTabPage(7);
            expect(store.getState().debug.dataPivotPage).toEqual({
                source: 3,
                data: 7
            });
        });
    });

    describe('store identity', () => {
        it('preserves action identities across updates', () => {
            const firstRef = store.getState().debug;
            store
                .getState()
                .debug.setDataTabSort({ colId: 'value', asc: true });
            const secondRef = store.getState().debug;
            expect(secondRef.setDataTabSort).toBe(firstRef.setDataTabSort);
            expect(secondRef.setSourceTabSort).toBe(firstRef.setSourceTabSort);
            expect(secondRef.setDataTabPage).toBe(firstRef.setDataTabPage);
            expect(secondRef.setSourceTabPage).toBe(firstRef.setSourceTabPage);
            expect(secondRef.setDatasetName).toBe(firstRef.setDatasetName);
        });
    });
});
