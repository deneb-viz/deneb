import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for the call-site gating pattern documented in
 * docs/solutions/best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md
 *
 * `VisualUpdateHistoryOverlay` is exported from `@deneb-viz/powerbi-host`
 * without an internal flag guard, so the app gates the mount at the JSX
 * call site in `app.tsx`; a disabled build then never invokes the
 * component at all. This is a static-source check that locks in the
 * structural invariant rather than a render assertion.
 */
describe('VisualUpdateHistoryOverlay call-site gating', () => {
    const appSource = readFileSync(resolve(__dirname, '..', 'app.tsx'), 'utf8');

    // Prettier may wrap the gated JSX in parentheses, so the pattern
    // tolerates `{FLAG && <Overlay />}` and `{FLAG && (<Overlay />)}`
    // spread over several lines.
    // `app.tsx` consumes the flag under the feature-specific name the
    // package entry re-exports it as (`IS_OVERLAY_ENABLED` collides with the
    // viewport-gate overlay's own export of the same name).
    const gatedMountPattern =
        /\{IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED\s*&&\s*\(?\s*<VisualUpdateHistoryOverlay\s*\/>\s*\)?\s*\}/g;

    it('app.tsx gates the mount with `{FLAG && <VisualUpdateHistoryOverlay />}` rather than mounting unconditionally', () => {
        expect(appSource).toMatch(gatedMountPattern);
    });

    it('app.tsx does not mount VisualUpdateHistoryOverlay outside the gate', () => {
        // Remove every gated occurrence; any tag left over is ungated.
        expect(appSource.replace(gatedMountPattern, '')).not.toContain(
            '<VisualUpdateHistoryOverlay'
        );
    });
});
