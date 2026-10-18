import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for the call-site gating pattern documented in
 * docs/solutions/best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md
 *
 * `VisualUpdateHistoryOverlay` must not guard its JSX with an internal
 * `if (!IS_OVERLAY_ENABLED) return <></>;`: with hooks above such a guard,
 * the subscriptions and memos would still run on every render, in every
 * build. The component exports `IS_OVERLAY_ENABLED` so the consuming app
 * gates the mount at the JSX call site, and a disabled build never invokes
 * the component at all.
 *
 * This package runs vitest under jsdom but has no React render harness wired
 * up, so this is a static-source check that locks in the structural invariant
 * rather than a render/subscription-count assertion. The consuming visual
 * pins the call-site gate in its own
 * `app/__test__/visual-update-history-overlay-gate.test.ts`.
 */
describe('VisualUpdateHistoryOverlay call-site gating', () => {
    const componentSource = readFileSync(
        resolve(__dirname, '..', 'visual-update-history-overlay.tsx'),
        'utf8'
    );

    it('exports IS_OVERLAY_ENABLED so callers can gate at the JSX call site', () => {
        expect(componentSource).toMatch(/export const IS_OVERLAY_ENABLED\s*=/);
    });

    it('does NOT early-return on IS_OVERLAY_ENABLED inside the component (the hooks above it would still run every render)', () => {
        expect(componentSource).not.toMatch(
            /if\s*\(!IS_OVERLAY_ENABLED\)\s*return/
        );
    });

    it('the feature barrel re-exports IS_OVERLAY_ENABLED for the package entry to re-export under a feature-specific name', () => {
        const indexSource = readFileSync(
            resolve(__dirname, '..', '..', 'index.ts'),
            'utf8'
        );
        expect(indexSource).toMatch(/\bIS_OVERLAY_ENABLED\b/);
    });
});
