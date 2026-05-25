import { describe, expect, it } from 'vitest';

import { VEGA_EMBED_ROOT_STYLE } from '../vega-embed-styles';

/**
 * Locks the descendant-display contract for the `<VegaEmbed>` root slot.
 *
 * Background: vega-embed renders a `<canvas>` (canvas renderer) or `<svg>`
 * (SVG renderer) as the chart element. Both default to `display: inline`
 * (they are replaced inline elements). The root is `display: block`, so any
 * inline child creates a line box with a ~4px strut descender below - which
 * inside the overlay scrollbar container shows up as vertical overflow.
 *
 * The fix in #480 originally targeted only `& svg` and missed the canvas
 * case (https://github.com/deneb-viz/deneb - vega-embed.tsx descendant
 * rule). This test pins the rule so a future selector refactor cannot
 * silently drop one of the two element targets.
 *
 * We test structural shape rather than computed CSS because Vitest runs in
 * the `node` environment here and Griffel's runtime style injection is not
 * readable via JSDOM's stub `getComputedStyle`.
 */
describe('VegaEmbed root style — descendant display normalisation', () => {
    /**
     * All nested rule entries (selector → declarations object) whose
     * declarations set `display: 'block'`. Top-level scalar declarations
     * (e.g. `display: 'block !important'` on the root itself) are skipped.
     *
     * The rule may be authored as a single combined selector
     * (`'& svg, & canvas'`) or as two separate entries — both shapes are
     * acceptable. Per-target assertions below verify each renderer's
     * element appears in some matching selector, without pinning the
     * authoring style.
     */
    const blockNestedRules = Object.entries(VEGA_EMBED_ROOT_STYLE).filter(
        ([, value]) =>
            typeof value === 'object' &&
            value !== null &&
            'display' in value &&
            (value as { display: unknown }).display === 'block'
    );

    it('covers `& svg` in at least one nested rule (SVG renderer output)', () => {
        expect(blockNestedRules.some(([selector]) => selector.includes('& svg'))).toBe(true);
    });

    it('covers `& canvas` in at least one nested rule (canvas renderer output — the bug being guarded)', () => {
        expect(blockNestedRules.some(([selector]) => selector.includes('& canvas'))).toBe(true);
    });

    it('root itself remains `display: block !important` (the other half of the #480 fix)', () => {
        expect(VEGA_EMBED_ROOT_STYLE.display).toBe('block !important');
    });
});
