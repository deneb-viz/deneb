import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for the call-site gating pattern documented in
 * docs/solutions/best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md
 * (see that doc's `ViewportGateDebugOverlay` case history — this is the
 * same fix applied to `VisualUpdateHistoryOverlay`).
 *
 * `VisualUpdateHistoryOverlay` previously guarded its JSX with an internal
 * `if (!IS_OVERLAY_ENABLED) return <></>;` placed AFTER two
 * `useDenebVisualState` subscriptions and two `useMemo`s. React's hooks
 * contract means that guard only suppressed the returned JSX — the
 * subscriptions and memo hooks still ran on every render, in every build,
 * even with `PBIVIZ_DEV_OVERLAY=false` (the default). The fix exports
 * `IS_OVERLAY_ENABLED` and gates the mount at the JSX call site in
 * `src/app/app.tsx` instead, so a disabled build never invokes the
 * component at all.
 *
 * The workspace defers component-tree render tests — vitest runs in the
 * `node` environment with no `@testing-library/react` wired up for this
 * package (see `src/features/toaster/__test__/notification-apply-changes-imports.test.ts`
 * and `packages/app-core/.../no-data-message.test.tsx` for the established
 * precedent). This is therefore a static-source check that locks in the
 * structural invariant rather than a render/subscription-count assertion.
 */
describe('VisualUpdateHistoryOverlay call-site gating', () => {
    const componentSource = readFileSync(
        resolve(__dirname, '..', 'visual-update-history-overlay.tsx'),
        'utf8'
    );
    const appSource = readFileSync(
        resolve(__dirname, '..', '..', '..', '..', 'app', 'app.tsx'),
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

    it('the feature barrel re-exports IS_OVERLAY_ENABLED for app.tsx to consume', () => {
        const indexSource = readFileSync(
            resolve(__dirname, '..', '..', 'index.ts'),
            'utf8'
        );
        expect(indexSource).toMatch(/\bIS_OVERLAY_ENABLED\b/);
    });

    it('app.tsx gates the mount with `{FLAG && <VisualUpdateHistoryOverlay />}` rather than mounting unconditionally', () => {
        expect(appSource).toMatch(
            /\{IS_UPDATE_HISTORY_OVERLAY_ENABLED\s*&&\s*<VisualUpdateHistoryOverlay\s*\/>\}/
        );
    });

    it('app.tsx does not mount VisualUpdateHistoryOverlay unconditionally', () => {
        expect(appSource).not.toMatch(
            /^\s*<VisualUpdateHistoryOverlay\s*\/>\s*$/m
        );
    });
});
