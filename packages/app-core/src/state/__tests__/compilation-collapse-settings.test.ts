import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileSpec } from '@deneb-viz/vega-runtime/compilation';

vi.mock('@deneb-viz/vega-runtime/compilation', () => ({
    compileSpec: vi.fn()
}));

import { createCompilationSlice } from '../compilation';

type CollapseSettings = { collapsible: boolean; collapsed: boolean };

type BindingsFixture = {
    paneCollapseChoice: boolean | null;
    lastCollapseSettings: CollapseSettings | null;
};

const makeBindings = (
    lastCollapseSettings: CollapseSettings | null,
    paneCollapseChoice: boolean | null
): BindingsFixture => ({ paneCollapseChoice, lastCollapseSettings });

const mockCompileResult = (
    status: 'ready' | 'error',
    collapseSettings: CollapseSettings
): void => {
    vi.mocked(compileSpec).mockReturnValue({
        status,
        errors: [],
        warnings: [],
        parsed: { bindingsSettings: { ...collapseSettings } }
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

describe('compilation slice: collapse settings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clears the reader choice and records the settings when a spec compiles with a changed collapsed setting', () => {
        mockCompileResult('ready', { collapsible: true, collapsed: true });
        const harness = makeSliceHarness(
            makeBindings({ collapsible: true, collapsed: false }, true)
        );
        harness.compile();
        expect(harness.getBindings().lastCollapseSettings).toEqual({
            collapsible: true,
            collapsed: true
        });
        expect(harness.getBindings().paneCollapseChoice).toBeNull();
    });

    it('clears the reader choice and records the settings when a spec compiles with a changed collapsible setting', () => {
        mockCompileResult('ready', { collapsible: false, collapsed: false });
        const harness = makeSliceHarness(
            makeBindings({ collapsible: true, collapsed: false }, true)
        );
        harness.compile();
        expect(harness.getBindings().lastCollapseSettings).toEqual({
            collapsible: false,
            collapsed: false
        });
        expect(harness.getBindings().paneCollapseChoice).toBeNull();
    });

    it('leaves the bindings state as it was when a spec compiles with the same settings', () => {
        mockCompileResult('ready', { collapsible: true, collapsed: false });
        const bindings = makeBindings(
            { collapsible: true, collapsed: false },
            true
        );
        const harness = makeSliceHarness(bindings);
        harness.compile();
        expect(harness.getBindings()).toBe(bindings);
    });

    it('leaves the choice and the recorded settings alone when a compile fails', () => {
        mockCompileResult('error', { collapsible: true, collapsed: true });
        const harness = makeSliceHarness(
            makeBindings({ collapsible: true, collapsed: false }, true)
        );
        harness.compile();
        expect(harness.getBindings().paneCollapseChoice).toBe(true);
        expect(harness.getBindings().lastCollapseSettings).toEqual({
            collapsible: true,
            collapsed: false
        });
    });
});
