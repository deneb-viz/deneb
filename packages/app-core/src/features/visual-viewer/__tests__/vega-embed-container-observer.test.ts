import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the #480 OoF-residual fix: `VegaEmbed` must
 * wire `observeContainerResize` onto its embed container so the
 * `denebContainer` signal tracks the container's PHYSICAL box, not
 * just update-driven effect timings. The workspace defers
 * component-tree render tests (no @testing-library/react — see the
 * precedent cited in visual-update-history-overlay-gate.test.ts), so
 * the wiring contract is locked structurally: the debounced observer
 * module itself is behaviour-tested in
 * container-size-observer.test.ts.
 */
describe('VegaEmbed container resize observer wiring', () => {
    const componentSource = readFileSync(
        resolve(__dirname, '..', 'components', 'vega-embed.tsx'),
        'utf8'
    );

    it('imports the debounced observer and the guarded refresh builder from the feature module', () => {
        expect(componentSource).toMatch(
            /import\s*\{[^}]*observeContainerResize[^}]*\}\s*from\s*'\.\.\/container-size-observer'/s
        );
        // The guard logic (signal-exists, non-zero box, value-equality,
        // scroll-offset preservation) lives in the tested module — the
        // component must consume it rather than hand-rolling a variant.
        expect(componentSource).toMatch(/\bgetContainerSignalRefresh\b/);
    });

    it('registers the observer against the embed container element', () => {
        expect(componentSource).toMatch(/observeContainerResize\(/);
    });

    it('returns the observer dispose from the effect for cleanup', () => {
        // The dispose returned by observeContainerResize must be the
        // effect's cleanup so unmount/deactivation disconnects the
        // ResizeObserver and cancels any pending trailing call.
        expect(componentSource).toMatch(
            /return\s+observeContainerResize\(|const\s+\w+\s*=\s*observeContainerResize\([\s\S]*?return\s+\w+;/
        );
    });

    it('reconcile effect depends only on viewReady — live tracking belongs to the observer', () => {
        // One authority per concern: the ResizeObserver owns ongoing
        // physical-size truth, so the older signal-update effect must
        // shrink to its unique residual value — the one-shot
        // post-embed reconciliation keyed on `viewReady` (a view born
        // from stale spec-init dims with no subsequent box change is
        // invisible to the observer). Viewport deps here would
        // reintroduce double-writes on every committed resize.
        expect(componentSource).not.toMatch(
            /\[viewportHeight,\s*viewportWidth,\s*viewReady\]/
        );
        // The stable refresh callback rides along per exhaustive-deps;
        // the contract is "isActive + viewReady and nothing
        // viewport-shaped". `isActive` is load-bearing: `viewReady` is
        // SHARED app-core state, so without the guard the inactive
        // viewer/editor twin also reconciles and can write its own
        // container's dimensions into the active view's singleton.
        expect(componentSource).toMatch(
            /\},\s*\[isActive,\s*viewReady,\s*refreshContainerSignal\]\);/
        );
    });

    it('both signal write paths share the guarded refresh helper', () => {
        // The reconcile effect and the observer callback must route
        // through the same guarded write (signal-exists, non-zero box,
        // value-equality suppression) — two hand-rolled variants is
        // how the guards drift apart.
        const occurrences =
            componentSource.match(/refreshContainerSignal\(/g) ?? [];
        expect(occurrences.length).toBeGreaterThanOrEqual(2);
    });
});
