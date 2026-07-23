// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type powerbi from 'powerbi-visuals-api';

// ─── Module mocks ─────────────────────────────────────────────────────────────
//
// Replays the EXACT host update sequence captured from Power BI Desktop
// during the #480 on-object-formatting (OoF) residual investigation
// (2026-07-23 dev-overlay trace). Unlike `updates.test.ts` (which stubs
// the display-mode helpers to isolate the M4 synchronous-throw
// contract), this suite runs the REAL display-mode module so the
// embed-viewport commit gate is exercised end-to-end: display-mode
// resolution → `doesModeAllowEmbedViewportSet` → ResizeEnd bitmask →
// `setEmbedViewport`.
//
// `powerbi-visuals-api` const enums are inlined by tsc in production
// builds but resolve to `undefined` under vitest's transform, which
// would silently break every bitmask helper in display-mode. The mock
// pins the production numeric values (guarded by `satisfies` checks in
// display-mode.ts against enum drift).
vi.mock('powerbi-visuals-api', () => ({
    default: {
        VisualUpdateType: {
            Data: 2,
            Resize: 4,
            ViewMode: 8,
            Style: 16,
            ResizeEnd: 32,
            All: 62
        },
        ViewMode: { View: 0, Edit: 1, InFocusEdit: 2 },
        EditMode: { Default: 0, Advanced: 1 }
    }
}));

// Map the `../../lib/state` barrel to the real display-mode module
// only. The barrel also re-exports `initializeStoreSynchronization`
// (sync.ts), which imports `@deneb-viz/app-core` and the full visual
// store — far heavier than this replay needs and irrelevant to the
// commit gate under test.
vi.mock('../../lib/state', async () => {
    return await vi.importActual('../../lib/state/display-mode');
});

vi.mock('../../lib/persistence', () => ({
    getVisualFormattingModel: vi.fn(() => ({
        resolveDeveloperSettings: vi.fn(),
        stateManagement: {
            viewport: {
                viewportHeight: { value: '710' },
                viewportWidth: { value: '949' }
            }
        },
        vega: {
            output: {
                jsonSpec: { value: 'NON_DEFAULT_SPEC' }
            }
        }
    }))
}));

vi.mock('@deneb-viz/configuration', async () => {
    const actual = await vi.importActual<
        typeof import('@deneb-viz/configuration')
    >('@deneb-viz/configuration');
    return actual;
});

import { createUpdatesSlice } from '../updates';

// ─── Trace fixture ────────────────────────────────────────────────────────────

/**
 * The captured host sequence, chronological. Heights: steady 710 →
 * OoF title-add shrinks to 682 (arrives WITH ResizeEnd, type 36) →
 * clicking off restores 710 (also type 36). Types are the production
 * `VisualUpdateType` bitmask values (64 = FormattingSubSelectionChange,
 * 128 = FormatModeChange — not in the API's typed enum but emitted by
 * Desktop's OoF host).
 */
const TRACE: Array<{ type: number; width: number; height: number }> = [
    { type: 2, width: 948.9655172413793, height: 710 },
    { type: 64, width: 948.9655172413793, height: 710 },
    { type: 128, width: 948.9655172413793, height: 710 },
    { type: 36, width: 948.9655172413793, height: 682 },
    { type: 2, width: 948.9655172413793, height: 682 },
    { type: 4, width: 949, height: 682 },
    { type: 2, width: 948.9655172413793, height: 682 },
    { type: 36, width: 948.9655172413793, height: 710 },
    { type: 2, width: 948.9655172413793, height: 710 },
    { type: 4, width: 949, height: 710 },
    { type: 2, width: 948.9655172413793, height: 710 }
];

const SCALE = 1.6111111111111112;

type EmbedViewport = { width: number; height: number; scale: number };

// ─── Stateful mini-store harness ─────────────────────────────────────────────

/**
 * Minimal stateful store: `set` applies the slice's partial-state
 * updater onto a mutable state object, `get` returns it — enough for
 * the slice's internal `get().interface` reads to observe the commits
 * its own `set` made, exactly as the production zustand store would.
 */
const buildHarness = () => {
    const embedCommits: EmbedViewport[] = [];
    const state = {
        updates: {
            __hydrated__: false,
            count: 0,
            history: [],
            options: null,
            lifecycleEvents: []
        },
        interface: {
            embedViewport: undefined as EmbedViewport | undefined,
            mode: 'initializing',
            isInFocus: false,
            viewport: { width: 0, height: 0 },
            setEmbedViewport: (viewport: EmbedViewport) => {
                state.interface.embedViewport = viewport;
                embedCommits.push(viewport);
            },
            setViewport: vi.fn()
        },
        dataset: { isFetchingAdditional: false },
        settings: {}
    };
    const stateCreator = createUpdatesSlice();
    const set = (
        updater: (current: typeof state) => Record<string, unknown>
    ) => {
        const partial =
            typeof updater === 'function' ? updater(state) : updater;
        // Preserve the interface setters across partial merges — the
        // slice's updater spreads `...state.interface`, so they carry
        // through; Object.assign applies the top-level slices.
        Object.assign(state, partial);
    };
    const get = () => state;
    const slice = stateCreator(
        set as unknown as Parameters<typeof stateCreator>[0],
        get as unknown as Parameters<typeof stateCreator>[1],
        {} as unknown as Parameters<typeof stateCreator>[2]
    );
    const drive = (update: { type: number; width: number; height: number }) => {
        slice.setVisualUpdateOptions({
            options: {
                viewport: {
                    width: update.width,
                    height: update.height,
                    scale: SCALE
                },
                type: update.type,
                viewMode: 1,
                editMode: 0,
                isInFocus: false,
                dataViews: [
                    { metadata: { columns: [{ displayName: 'stub' }] } }
                ]
            } as unknown as powerbi.extensibility.visual.VisualUpdateOptions,
            isDeveloperMode: false
        });
    };
    return { state, embedCommits, drive };
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('updates slice: OoF viewport commit replay (#480 residual)', () => {
    it('commits the OoF shrink (type 36 @ 682) to embedViewport', () => {
        const { state, drive } = buildHarness();
        TRACE.slice(0, 4).forEach(drive);
        expect(state.interface.embedViewport).toEqual({
            width: 949,
            height: 682,
            scale: SCALE
        });
    });

    it('commits the OoF restore (type 36 @ 710) back to embedViewport', () => {
        const { state, drive } = buildHarness();
        TRACE.slice(0, 8).forEach(drive);
        expect(state.interface.embedViewport).toEqual({
            width: 949,
            height: 710,
            scale: SCALE
        });
    });

    it('resolves every update in the sequence as viewer mode (no transition misclassification)', () => {
        const { state, drive } = buildHarness();
        const modes: string[] = [];
        TRACE.forEach((update) => {
            drive(update);
            modes.push(state.interface.mode);
        });
        expect(modes).toEqual(TRACE.map(() => 'viewer'));
    });

    it('ends the full sequence with embedViewport at the restored 710', () => {
        const { state, embedCommits, drive } = buildHarness();
        TRACE.forEach(drive);
        expect(state.interface.embedViewport).toEqual({
            width: 949,
            height: 710,
            scale: SCALE
        });
        // Initial commit (first update, !embedViewport), the shrink,
        // and the restore — nothing else in the sequence should touch
        // the embed viewport.
        expect(embedCommits.map((commit) => commit.height)).toEqual([
            710, 682, 710
        ]);
    });
});
