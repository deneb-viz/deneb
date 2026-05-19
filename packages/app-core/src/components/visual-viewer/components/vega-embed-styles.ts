/**
 * Root-slot style object for `<VegaEmbed>`'s container. Lives in its own
 * module so the runtime call site (`vega-embed.tsx`) and the structural
 * regression test (`__tests__/vega-embed-canvas-display.test.ts`) can both
 * import it without the component file having to widen its export surface
 * just to make tests possible. See the test docblock for why the contract
 * is asserted on the source style object rather than computed CSS.
 */
export const VEGA_EMBED_ROOT_STYLE = {
    height: '100%',
    width: '100%',
    // #480 (SVG) / canvas-overflow follow-up: remove the line-box descender
    // gap that otherwise produces a ~4px vertical scroll overflow on fitted
    // specs inside the overlay scroll container. Two fixes are needed, at
    // two different layers:
    //
    // 1. `display: block` on THIS element (the root) overrides the
    //    `display: inline-block` that the vega-embed library adds when it
    //    mutates this div with the `.vega-embed` class. Without this, the
    //    parent (#deneb-vega-container) creates a line box around the
    //    inline-block and adds ~4px of strut descender below it.
    //    !important is needed because the upstream `.vega-embed` rule has
    //    equal specificity.
    //
    // 2. `display: block` on the rendered descendant - `<svg>` for the SVG
    //    renderer, `<canvas>` for the canvas renderer - overrides their
    //    default `display: inline` (both are replaced inline elements).
    //    Without this, the root (now block) creates a line box around the
    //    inline child with the same ~4px descender below. Fixing only one
    //    of the two layers moves the gap but doesn't eliminate it; missing
    //    `canvas` here re-introduced the overflow when the user switched
    //    to the canvas renderer.
    display: 'block !important',
    '& svg, & canvas': {
        display: 'block'
    },
    // Hide vega-embed actions menu (workaround: actions: false doesn't fully work and needs further investigation).
    '& .vega-actions': {
        display: 'none !important'
    },
    // Embed always adds the .has-actions class, which adds padding. Remove it here.
    paddingRight: '0 !important'
} as const;
