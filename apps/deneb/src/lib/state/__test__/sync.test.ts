import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SliceSyncDefinition } from '../sync-types';

// ─── Mock Setup ──────────────────────────────────────────────────────────────
//
// `sync.ts` composes two things this test cares about: the per-slice
// `createSliceSync` registrations, and the generic dataset/embed-viewport
// subscriptions that also live in this module. Only `createSliceSync` is
// mocked — its own subscription behaviour is covered by
// `create-slice-sync.test.ts`. Everything else is mocked purely so importing
// `sync.ts` (and the real slice mapping modules it pulls in) doesn't touch
// the real app-core/visual stores.

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({}))
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

const buildContributedDefinition = (name: string): SliceSyncDefinition => ({
    name,
    getSlice: vi.fn(),
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
});
