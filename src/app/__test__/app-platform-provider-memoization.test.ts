import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for `App`'s `platformProvider` object passed to
 * `<DenebProvider>`. It used to be an inline object literal rebuilt on
 * every `App` render, breaking reference equality for any context
 * consumer further down the tree that compares it (e.g. a `useMemo` /
 * `useEffect` dependency, or `React.memo` props equality). The fix wraps
 * it in `useMemo`.
 *
 * `App` is the root visual's top-level component — it closes over the
 * live Power BI host, the global Zustand stores, and Vega's loader/embed
 * machinery, none of which this workspace mocks for component-tree
 * render tests (see `src/features/toaster/__test__/notification-apply-changes-imports.test.ts`
 * and `packages/app-core/.../no-data-message.test.tsx` for the
 * established "defer component-tree tests, assert on source structure"
 * precedent). This is therefore a static-source check that locks in the
 * memoization and its dependency array rather than a render harness.
 */
describe('App platformProvider memoization', () => {
    const source = readFileSync(
        resolve(__dirname, '..', 'app.tsx'),
        'utf8'
    );

    it('wraps platformProvider in useMemo rather than an inline object literal', () => {
        expect(source).toMatch(
            /const platformProvider = useMemo\(\s*\(\)\s*=>\s*\(\{/
        );
    });

    it('DenebProvider consumes the memoized platformProvider variable, not an inline object', () => {
        expect(source).toMatch(
            /<DenebProvider platformProvider=\{platformProvider\}>/
        );
    });

    it('does not suppress react-hooks/exhaustive-deps on the memo (dep array must be complete, not silenced)', () => {
        const memoBlock = extractPlatformProviderMemoBlock(source);
        expect(memoBlock).not.toMatch(/eslint-disable/);
    });

    it('the dependency array includes every prop/state identifier the factory closes over', () => {
        const depsArray = extractDepsArray(source);
        const expectedDeps = [
            'host',
            'isDownloadPermitted',
            'launchUrl',
            'onRenderingError',
            'onRenderingFinished',
            'onRenderingStarted',
            'pbiTooltipHandler',
            'vegaLoader',
            'viewEventBinders'
        ];
        for (const dep of expectedDeps) {
            expect(
                depsArray,
                `expected "${dep}" in the platformProvider useMemo deps array`
            ).toContain(dep);
        }
        // No extras beyond what's expected — module-level functions
        // (persistOnCreateFromTemplate, handlePersistBooleanProperty) and
        // static JSX/constants (PLATFORM_SECTION_KEYS,
        // platformSearchContributions) must NOT appear here; they are
        // stable outside of `App`'s render and adding them would be a
        // sign the memo is over-scoped.
        expect(depsArray.sort()).toEqual(expectedDeps.sort());
    });
});

const extractPlatformProviderMemoBlock = (source: string): string => {
    const start = source.indexOf('const platformProvider = useMemo(');
    expect(start, 'could not find the platformProvider useMemo in app.tsx').toBeGreaterThan(
        -1
    );
    const end = source.indexOf('\n    return (', start);
    expect(
        end,
        'could not find the end of the platformProvider useMemo block'
    ).toBeGreaterThan(start);
    return source.slice(start, end);
};

const extractDepsArray = (source: string): string[] => {
    const block = extractPlatformProviderMemoBlock(source);
    // The deps array immediately follows the factory's closing `}),` —
    // anchoring there (rather than searching for any `[...]`) avoids
    // matching the `settingsPanePlatformComponent` array literal inside
    // the factory body.
    const match = block.match(/\}\),\s*\[\s*([\s\S]*?)\s*\]\s*\)\s*;/);
    expect(match, 'could not locate the useMemo dependency array').not.toBeNull();
    return match![1]
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
};
