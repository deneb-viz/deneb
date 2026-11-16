import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Canary for the platform provider every visual gives `DenebProvider`. It
 * must be memoized on exactly the values it closes over, so context
 * consumers keep a stable reference, and each visual's own memo can depend
 * on it. The hook closes over the live Power BI host and the global stores,
 * which nothing here mocks, so this checks the source rather than renders.
 */
const source = readFileSync(
    resolve(__dirname, '..', 'use-platform-provider.ts'),
    'utf8'
);

const providerMemo = (() => {
    const start = source.indexOf('return useMemo(');
    return start === -1 ? '' : source.slice(start);
})();

describe('usePlatformProvider', () => {
    it('returns a memoized object rather than a literal rebuilt on every render', () => {
        expect(providerMemo).toMatch(/^return useMemo\(\s*\(\)\s*=>\s*\(\{/);
    });

    it('does not suppress react-hooks/exhaustive-deps on the memo', () => {
        expect(providerMemo).not.toMatch(/eslint-disable/);
    });

    it('depends on every value the provider closes over, and nothing else', () => {
        const deps = providerMemo
            .match(/\}\),\s*\[\s*([\s\S]*?)\s*\]\s*\)\s*;/)?.[1]
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
        // `persistOnCreateFromTemplate` is a module-level function, so it is
        // stable and stays out of the list.
        expect(deps?.sort()).toEqual(
            [
                'launchUrl',
                'onRenderingError',
                'onRenderingFinished',
                'onRenderingStarted',
                'pbiTooltipHandler',
                'vegaLoader',
                'viewEventBinders'
            ].sort()
        );
    });
});
