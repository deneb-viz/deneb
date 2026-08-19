import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the container-signal single-owner contract
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md).
 * The workspace defers component/hook render tests (no
 * @testing-library/react); the hook's logic pieces are
 * behaviour-tested in container-size-observer.test.ts, and this locks
 * the wiring.
 */
describe('useContainerSignalOwner wiring', () => {
    const hookSource = readFileSync(
        resolve(__dirname, '..', 'use-container-signal-owner.ts'),
        'utf8'
    );

    it('routes scroll writes through the measured-container builder', () => {
        expect(hookSource).toMatch(/getMeasuredContainerRefresh\(/);
        expect(hookSource).toMatch(/setSignalByName\(/);
    });

    it('geometry changes route through the cheap re-embed action, not signal writes', () => {
        expect(hookSource).toMatch(/refreshContainerDimensions\(/);
    });

    it('post-embed reconcile seeds the scroll fields (scrollWidth/Height are 0 at compile time and must not wait for the first scroll)', () => {
        // Trigger 2 must feed BOTH channels: geometry (re-embed if the box
        // drifted) and the six-field signal write (content extent).
        expect(hookSource).toMatch(
            /if \(!isActive \|\| !viewReady\) return;\s*refreshGeometry\(\);\s*refreshScrollSignal\(\);/
        );
    });

    it('post-embed reconcile re-fires per fresh view (renderId), not only per viewReady toggle', () => {
        // `useVegaEmbed` re-embeds on deep change of [spec, options] but the
        // viewReady window only opens on spec change — an options-only
        // re-embed (zoom, log level, render mode) births a view with the
        // 0-seeded scroll fields and no viewReady toggle. `renderId` bumps
        // on EVERY handleEmbed, so it must be in the reconcile's deps.
        expect(hookSource).toMatch(
            /refreshScrollSignal\(\);\s*\}, \[\s*isActive,\s*viewReady,\s*renderId,/
        );
    });

    it('registers the debounced ResizeObserver on the measured container', () => {
        expect(hookSource).toMatch(/observeContainerResize\(/);
    });

    it('guards every trigger on isActive (inactive twin must never write the shared singleton)', () => {
        // Three trigger effects, each opening with the isActive guard.
        const guards = hookSource.match(/if \(!isActive/g) ?? [];
        expect(guards.length).toBeGreaterThanOrEqual(3);
    });

    const viewerSource = readFileSync(
        resolve(__dirname, '..', 'components', 'visual-viewer.tsx'),
        'utf8'
    );

    it('VisualViewer wires the owner hook', () => {
        expect(viewerSource).toMatch(/useContainerSignalOwner\(\{/);
    });

    it('VisualViewer no longer writes the signal itself', () => {
        // The old scroll effect built the signal directly; after
        // consolidation the component must not touch the signal API.
        expect(viewerSource).not.toMatch(/getSignalDenebContainer/);
        expect(viewerSource).not.toMatch(/setSignalByName/);
    });

    it('compile effects do not depend on viewport dimensions (resizes are signal-only)', () => {
        // Any dependency-array entry for viewportHeight/Width would
        // reintroduce recompile-on-resize. The dims reach compiles via
        // the call-time snapshot instead.
        expect(viewerSource).not.toMatch(/viewportHeight,/);
        expect(viewerSource).not.toMatch(/viewportWidth,?\s*\]/);
        expect(viewerSource).toMatch(/getCompileDimensionsSnapshot/);
    });

    const embedSource = readFileSync(
        resolve(__dirname, '..', 'components', 'vega-embed.tsx'),
        'utf8'
    );

    it('VegaEmbed is embed-lifecycle only — no signal writes, no observers', () => {
        expect(embedSource).not.toMatch(/observeContainerResize/);
        expect(embedSource).not.toMatch(/getContainerSignalRefresh/);
        expect(embedSource).not.toMatch(/getMeasuredContainerRefresh/);
        expect(embedSource).not.toMatch(/setSignalByName/);
    });
});
