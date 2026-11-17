import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileSpec } from '@deneb-viz/vega-runtime/compilation';

vi.mock('@deneb-viz/vega-runtime/compilation', () => ({
    compileSpec: vi.fn()
}));

import { createCompilationSlice } from '../compilation';

type BindingsFixture = {
    paneCollapseChoice: boolean | null;
    lastCollapsedSetting: boolean | null;
};

const makeBindings = (
    lastCollapsedSetting: boolean | null,
    paneCollapseChoice: boolean | null
): BindingsFixture => ({ paneCollapseChoice, lastCollapsedSetting });

const mockCompileResult = (
    status: 'ready' | 'error',
    collapsed: boolean
): void => {
    vi.mocked(compileSpec).mockReturnValue({
        status,
        errors: [],
        warnings: [],
        parsed: { bindingsSettings: { collapsed } }
    } as never);
};

const makeSliceHarness = (bindings: BindingsFixture) => {
    let state = {
        compilation: {
            result: null,
            lastCompiled: null,
            viewReady: false,
            runtimeErrors: [],
            runtimeWarnings: [],
            durableWarnings: [],
            durableErrors: []
        },
        bindings,
        editorZoomLevel: 100,
        editor: { isDirty: false },
        commands: {}
    } as never;
    const setSpy = vi.fn((updater: (s: never) => Partial<never>) => {
        state = { ...(state as object), ...updater(state) } as never;
    });
    const slice = createCompilationSlice()(
        setSpy as never,
        (() => state) as never,
        {} as never
    );
    state = { ...(state as object), ...slice } as never;
    return {
        getBindings: () => (state as { bindings: BindingsFixture }).bindings,
        compile: () => slice.compilation.compile({} as never)
    };
};

describe('compilation slice: collapsed setting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clears the reader choice and records the setting when a spec compiles with a changed setting', () => {
        mockCompileResult('ready', true);
        const harness = makeSliceHarness(makeBindings(false, true));
        harness.compile();
        expect(harness.getBindings().lastCollapsedSetting).toBe(true);
        expect(harness.getBindings().paneCollapseChoice).toBeNull();
    });

    it('leaves the bindings state as it was when a spec compiles with the same setting', () => {
        mockCompileResult('ready', false);
        const bindings = makeBindings(false, true);
        const harness = makeSliceHarness(bindings);
        harness.compile();
        expect(harness.getBindings()).toBe(bindings);
    });

    it('leaves the choice and the recorded setting alone when a compile fails', () => {
        mockCompileResult('error', true);
        const harness = makeSliceHarness(makeBindings(false, true));
        harness.compile();
        expect(harness.getBindings().paneCollapseChoice).toBe(true);
        expect(harness.getBindings().lastCollapsedSetting).toBe(false);
    });
});
