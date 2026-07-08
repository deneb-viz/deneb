// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────
//
// `setVisualUpdateOptions` (the M4 target) is exercised in isolation:
// the slice creator only invokes `set`/`get` lazily inside the setter,
// so structural stubs are sufficient. `getVisualFormattingModel` is the
// synchronous throw source the audit identified; `../../lib/state`
// helpers and the configuration constant are stubbed so the module
// loads without its heavier real dependencies.

vi.mock('../../lib/persistence', () => ({
    getVisualFormattingModel: vi.fn()
}));
vi.mock('../../lib/state', () => ({
    getUpdatedDisplayHistoryList: vi.fn(() => []),
    doesModeAllowEmbedViewportSet: vi.fn(() => false),
    isVisualUpdateTypeResizeEnd: vi.fn(() => false),
    isVisualUpdateTypeVolatile: vi.fn(() => false)
}));
vi.mock('@deneb-viz/configuration', () => ({
    DEFAULT_VIEWPORT_SCALE: 1
}));

import { getVisualFormattingModel } from '../../lib/persistence';
import { createUpdatesSlice, type VisualUpdateDataPayload } from '../updates';

// ─── Harness ──────────────────────────────────────────────────────────────────

/**
 * Build the `setVisualUpdateOptions` setter against stubbed `set`/`get`.
 * The slice creator does not touch `set`/`get` at creation time (only
 * when a setter runs), so the `unknown` casts here are safe — the store
 * middleware types are irrelevant to what this test drives.
 */
const buildSetVisualUpdateOptions = (getState: () => unknown) => {
    const stateCreator = createUpdatesSlice();
    const set = vi.fn();
    const get = vi.fn(getState);
    const slice = stateCreator(
        set as unknown as Parameters<typeof stateCreator>[0],
        get as unknown as Parameters<typeof stateCreator>[1],
        {} as unknown as Parameters<typeof stateCreator>[2]
    );
    return slice.setVisualUpdateOptions;
};

const buildPayload = (): VisualUpdateDataPayload =>
    ({
        options: {
            dataViews: [{}],
            viewport: { width: 100, height: 100 },
            type: 0,
            isInFocus: false
        },
        isDeveloperMode: false
    }) as unknown as VisualUpdateDataPayload;

const buildSuccessGetState = () => ({
    interface: {
        embedViewport: undefined,
        mode: 'view',
        viewport: { width: 0, height: 0 },
        setEmbedViewport: vi.fn(),
        setViewport: vi.fn()
    },
    dataset: { isFetchingAdditional: false }
});

const buildSuccessSettingsStub = () =>
    ({
        resolveDeveloperSettings: vi.fn(),
        stateManagement: {
            viewport: {
                viewportHeight: { value: '0' },
                viewportWidth: { value: '0' }
            }
        }
    }) as unknown as ReturnType<typeof getVisualFormattingModel>;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('updates slice: setVisualUpdateOptions (M4 — truthful synchronous setter)', () => {
    it('throws SYNCHRONOUSLY when getVisualFormattingModel throws (does not swallow the throw into a rejected promise)', () => {
        // Pre-fix (async setter) this call would return a rejected
        // promise and NOT throw synchronously — `update()`'s try/catch
        // would miss it and the update would close on the success path.
        vi.mocked(getVisualFormattingModel).mockImplementation(() => {
            throw new Error('settings model resolution failed');
        });
        const setVisualUpdateOptions = buildSetVisualUpdateOptions(() => ({}));
        expect(() => setVisualUpdateOptions(buildPayload())).toThrow(
            'settings model resolution failed'
        );
    });

    it('returns void (not a Promise) on the success path', () => {
        vi.mocked(getVisualFormattingModel).mockImplementation(() =>
            buildSuccessSettingsStub()
        );
        const setVisualUpdateOptions = buildSetVisualUpdateOptions(
            buildSuccessGetState
        );
        const result = setVisualUpdateOptions(buildPayload());
        expect(result).toBeUndefined();
        expect(result).not.toBeInstanceOf(Promise);
    });
});
