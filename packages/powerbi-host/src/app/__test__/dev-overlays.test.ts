import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for the call-site gating pattern documented in
 * docs/solutions/best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md
 *
 * The overlay components carry no internal flag guard, so `DevOverlays`
 * gates each mount at its JSX call site; a build with an overlay off then
 * never invokes that component at all. This is a static-source check that
 * locks in the structural invariant rather than a render assertion.
 */
const source = readFileSync(
    resolve(__dirname, '..', 'dev-overlays.tsx'),
    'utf8'
);

describe.each([
    ['VisualUpdateHistoryOverlay', 'IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED'],
    ['ViewportGateDebugOverlay', 'IS_VIEWPORT_GATE_OVERLAY_ENABLED']
])('%s call-site gating', (component, flag) => {
    // Prettier may wrap the gated JSX in parentheses, so the pattern
    // tolerates `{FLAG && <Overlay />}` and `{FLAG && (<Overlay />)}`
    // spread over several lines.
    const gatedMountPattern = new RegExp(
        `\\{${flag}\\s*&&\\s*\\(?\\s*<${component}\\s*/>\\s*\\)?\\s*\\}`,
        'g'
    );

    it(`gates the mount with \`{${flag} && <${component} />}\``, () => {
        expect(source).toMatch(gatedMountPattern);
    });

    it('does not mount it outside the gate', () => {
        // Remove every gated occurrence; any tag left over is ungated.
        expect(source.replace(gatedMountPattern, '')).not.toContain(
            `<${component}`
        );
    });
});
