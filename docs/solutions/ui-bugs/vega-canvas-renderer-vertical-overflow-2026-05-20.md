---
title: Canvas renderer overflows VegaEmbed container by ~4px due to inline line-box descender
date: 2026-05-20
category: ui-bugs
module: app-core/visual-viewer
problem_type: ui_bug
component: tooling
symptoms:
  - "Switching Vega renderer from `svg` to `canvas` adds ~4px vertical overflow inside the OverlayScrollbars container"
  - "SVG renderer path is unaffected; only the canvas renderer triggers the scrollbar/overflow"
  - "Visual content renders correctly but a sliver of empty space appears below the `<canvas>` element"
  - "Same failure mode as issue #480 (fixed in PR #611 for SVG) re-manifesting on the canvas path"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - app-core/visual-viewer/vega-embed
  - app-core/visual-viewer/vega-embed-styles
  - vega-embed
  - overlay-scrollbars
tags:
  - css
  - griffel
  - vega-embed
  - canvas-renderer
  - line-box
  - descender
  - replaced-inline-element
  - display-block
---

# Canvas renderer overflows VegaEmbed container by ~4px due to inline line-box descender

## Problem

Switching the Vega renderer to `canvas` introduces ~4px of vertical overflow inside the `OverlayScrollbarsComponent` wrapping `<VegaEmbed>`, producing a spurious vertical scrollbar on specs that should fit. The SVG renderer is unaffected — the descendant `display: block` rule from PR #611 only matched `<svg>`, leaving `<canvas>` to inherit its default `display: inline` and re-introduce a line-box descender below it.

## Symptoms

- With `renderMode: 'canvas'`, any otherwise-fitted spec shows a vertical scrollbar inside the overlay scroll container.
- DevTools on the rendered chart:
    - The `<canvas>` element has computed `display: inline`.
    - There is a ~4px gap between the bottom of the `<canvas>` and the bottom of its parent `.vega-embed` div.
    - The overlay scroll container reports content height ~4px greater than its viewport.
- Switching `renderMode` back to `svg` makes the scrollbar disappear immediately, without any other change.
- The `vega-embed.tsx` root has `display: block !important` applied correctly — the gap is below the canvas, not above the root.

## What Didn't Work

PR #611 (closes #480) fixed this exact failure mode for the SVG renderer. Its fix comment correctly identified that the descender gap requires two layers of override (the root div and the rendered descendant), but only the SVG case was considered — there's no evidence the fix was exercised under `renderMode: 'canvas'`, where vega-embed renders a `<canvas>` instead of an `<svg>`. The descendant selector `'& svg': { display: 'block' }` simply doesn't match canvas output, so the second layer of the #480 fix silently no-ops for canvas users.

Compounding the gap: the #480 fix was never written up under `docs/solutions/`. The only institutional record was a comment block on the style slot itself, and an oblique mention in [`docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) ("a different 4px bug (fixed separately)") with no link. That made the canvas-side regression effectively invisible to anyone searching the solutions index for "4px", "overflow", or "vega-embed". This doc closes that gap as well.

## Solution

Extend the descendant selector to cover both renderers, and extract the style slot to a sibling module so it can be unit-tested and signalled as intentionally shared.

Before, in [`packages/app-core/src/components/visual-viewer/components/vega-embed.tsx`](../../../packages/app-core/src/components/visual-viewer/components/vega-embed.tsx):

```typescript
'& svg': {
    display: 'block'
},
```

After, in [`packages/app-core/src/components/visual-viewer/components/vega-embed-styles.ts`](../../../packages/app-core/src/components/visual-viewer/components/vega-embed-styles.ts) (new file):

```typescript
export const VEGA_EMBED_ROOT_STYLE = {
    height: '100%',
    width: '100%',
    display: 'block !important',
    '& svg, & canvas': {
        display: 'block'
    },
    '& .vega-actions': {
        display: 'none !important'
    },
    paddingRight: '0 !important'
} as const;
```

`vega-embed.tsx` now imports the constant and passes it to `makeStyles({ root: VEGA_EMBED_ROOT_STYLE })`. Extracting the slot to its own module is a deliberate signal: this style is load-bearing for a non-obvious browser mechanic (see below) and is now covered by tests — touch it carefully.

Test file at [`packages/app-core/src/components/visual-viewer/components/__tests__/vega-embed-canvas-display.test.ts`](../../../packages/app-core/src/components/visual-viewer/components/__tests__/vega-embed-canvas-display.test.ts) (new):

```typescript
import { describe, expect, it } from 'vitest';
import { VEGA_EMBED_ROOT_STYLE } from '../vega-embed-styles';

describe('VegaEmbed root style — descendant display normalisation', () => {
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
```

## Why This Works

Both `<canvas>` and `<svg>` are **replaced inline elements** in HTML's default user-agent stylesheet — "replaced" because the browser substitutes their visual box with externally-defined content (a bitmap, a vector scene), "inline" because they participate in their parent's line box like text would.

When a block-level container holds an inline child, the browser constructs a line box around that child. Every line box contains a **strut** — an invisible zero-width inline placeholder sized to the parent's `font-size` and `line-height` — that forces the line box's height to at least `font-size × line-height` and reserves the strut's descender space below the baseline. Even with no actual text, that descender is real layout space — typically ~4px for default 16px / 1.2 line-height.

A replaced inline element sits on the line box's baseline, with the strut's descender extending below it. To the layout engine, that descender belongs to the line box, not the canvas — so the canvas's computed height is correct, but its containing block (the `.vega-embed` div) reports an extra ~4px below it. Anything measuring the parent's content height (here, OverlayScrollbars) sees overflow.

The #480 fix already had layer 1 working for canvas (root `display: block !important` keeps the *grandparent* from creating a line box). Layer 2 was selector-scoped to `svg` only, so canvas fell through to its default `display: inline` and re-created the exact same line-box descender one level deeper. Extending the selector to `& svg, & canvas` closes that fall-through — both renderers' output is now block-level, neither creates a line box, neither generates a descender.

## Prevention

- **Primary guardrail: the unit test.** It iterates over `VEGA_EMBED_ROOT_STYLE`'s entries, filters to nested rules whose `display` is `block`, and asserts both `& svg` and `& canvas` are covered. The `Object.entries(...).filter(...).some(([sel]) => sel.includes(...))` pattern is tolerant of style-object restructuring (adding nested rules, reordering keys, splitting the combined selector into two) but fails loudly if either renderer's coverage is dropped.
- **Visual smoke before merging style changes here:** load a fitted spec under both `renderMode: 'svg'` and `renderMode: 'canvas'` and confirm no scrollbar appears in the overlay scroll container. The bug is invisible until you flip the renderer setting.
- **Cross-reference:** if you find yourself debugging a "tiny scrollbar appears for no reason" symptom anywhere near a Fluent UI / OverlayScrollbars layout containing replaced inline elements, suspect the line-box strut before you suspect the measurement code.

## Related Issues

- [`docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — line 41 mentions the original SVG line-box gap as "a different 4px bug (fixed separately)". This doc is the consolidated write-up of that class of bug (SVG + canvas).
- [`docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md`](viewer-bounce-on-editor-exit-2026-05-04.md) and [`docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`](freeze-on-viewer-editor-transition-2026-05-01.md) — touch the same `<VegaEmbed>` mount boundary from a mount/teardown timing angle. Same file area, different symptom.
- Original SVG fix: issue **#480** / PR **#611** ("feat: improve scrollbars and container utilization").
