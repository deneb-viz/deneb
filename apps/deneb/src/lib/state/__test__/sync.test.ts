import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineSliceSync, type SliceSyncDefinition } from '../sync-types';
import type { getDenebState } from '@deneb-viz/app-core';

// ─── Mock Setup ──────────────────────────────────────────────────────────────
//
// `sync.ts` composes two things this test cares about: the per-slice
// `createSliceSync` registrations, and the generic dataset/embed-viewport
// subscriptions that also live in this module. Only `createSliceSync` is
// mocked — its own subscription behaviour is covered by
// `create-slice-sync.test.ts`. Everything else is mocked purely so importing
// `sync.ts` (and the real slice mapping modules it pulls in) doesn't touch
// the real app-core/visual stores.

// Stable per-slice objects (not fresh literals) so `assertDistinctSliceSyncTargets`'s
// reference-identity check has something meaningful to compare: every call to
// `getDenebState()` returns a new wrapper object, but reads the same three
// slice references out of it.
const mockProjectSlice = { name: 'project-slice' };
const mockVisualRenderSlice = { name: 'visualRender-slice' };
const mockCompilationSlice = { name: 'compilation-slice' };

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        project: mockProjectSlice,
        visualRender: mockVisualRenderSlice,
        compilation: mockCompilationSlice
    }))
}));

vi.mock('../../../state', () => ({
    useDenebVisualState: {
        subscribe: vi.fn(() => vi.fn()),
        getState: vi.fn(() => ({
            dataset: { version: 0, fields: [], values: [] },
            interface: {
                embedViewport: undefined,
                mode: 'viewer',
                isInFocus: false
            },
            updates: { __hydrated__: false },
            settings: {}
        }))
    }
}));

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn(),
    logError: vi.fn()
}));

vi.mock('../../persistence', () => ({
    persistProjectProperties: vi.fn()
}));

const registeredUnsubscribers: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock('../create-slice-sync', () => ({
    createSliceSync: vi.fn((definition: SliceSyncDefinition) => {
        const unsub = vi.fn();
        registeredUnsubscribers[definition.name] = unsub;
        return unsub;
    })
}));

import { initializeStoreSynchronization } from '../sync';
import { createSliceSync } from '../create-slice-sync';

const GENERIC_SLICE_SYNC_NAMES = ['project', 'visualRender', 'compilation'];

const buildContributedDefinition = (
    name: string,
    slice: unknown = {}
): SliceSyncDefinition => ({
    name,
    getSlice: vi.fn(() => slice),
    getSyncFn: vi.fn(),
    isHydrated: vi.fn(),
    getSliceValue: vi.fn(),
    mappings: []
});

const registeredNames = () =>
    vi
        .mocked(createSliceSync)
        .mock.calls.map(([definition]) => definition.name);

describe('initializeStoreSynchronization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const key of Object.keys(registeredUnsubscribers)) {
            delete registeredUnsubscribers[key];
        }
    });

    it('registers only the generic slice syncs when no contributions are given', () => {
        initializeStoreSynchronization();

        expect(registeredNames()).toEqual(GENERIC_SLICE_SYNC_NAMES);
    });

    it('registers a contributed definition after the generic ones and tears it down together with them', () => {
        const contributed = buildContributedDefinition('editorPreferences');

        const teardown = initializeStoreSynchronization([contributed]);

        expect(registeredNames()).toEqual([
            ...GENERIC_SLICE_SYNC_NAMES,
            'editorPreferences'
        ]);

        teardown();

        for (const name of [...GENERIC_SLICE_SYNC_NAMES, 'editorPreferences']) {
            expect(registeredUnsubscribers[name]).toHaveBeenCalledTimes(1);
        }
    });

    it('refuses a contributed definition that targets an already-synced slice, registering nothing', () => {
        const collidingContribution = buildContributedDefinition('project');

        expect(() =>
            initializeStoreSynchronization([collidingContribution])
        ).toThrow(/project/);

        expect(createSliceSync).not.toHaveBeenCalled();
    });

    it('refuses a contributed definition whose getSlice resolves to the same slice object as a generic one, even under a distinct name', () => {
        const collidingContribution = buildContributedDefinition(
            'editorPreferences',
            mockProjectSlice
        );

        expect(() =>
            initializeStoreSynchronization([collidingContribution])
        ).toThrow(/project/);

        expect(createSliceSync).not.toHaveBeenCalled();
    });
});

describe('defineSliceSync', () => {
    it('keeps getSlice as the source of truth for the slice type, so a mismatched getSyncFn fails to compile', () => {
        // Type-level proof only: `defineSliceSync` is a runtime identity function
        // (see sync-types.ts), so calling it here is safe and never invokes the
        // callbacks below. The `@ts-expect-error` line is what this test pins —
        // if `defineSliceSync` regressed to widening its argument to `any`
        // before checking it (the bug it fixes), the error below would vanish
        // and `tsc --noEmit` would fail the build on the now-unused directive.
        const definition = defineSliceSync({
            name: 'typeCheckOnly',
            getSlice: (state) =>
                (state as ReturnType<typeof getDenebState>).project,
            // @ts-expect-error 'project' slice has no `nonExistentMethod` — proves
            // getSlice's return type still drives inference for getSyncFn.
            getSyncFn: (slice) => slice.nonExistentMethod,
            isHydrated: (slice) => slice.__hasHydrated__,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: []
        });

        expect(definition.name).toBe('typeCheckOnly');
    });
});
