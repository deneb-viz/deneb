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

    it('routes every write through the measured-container builder', () => {
        expect(hookSource).toMatch(/getMeasuredContainerRefresh\(/);
        expect(hookSource).toMatch(/setSignalByName\(/);
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
