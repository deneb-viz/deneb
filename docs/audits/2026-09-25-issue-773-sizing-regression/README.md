# Issue #773 — enter-encoded Vega marks are cut off in 2.0

**Status:** root cause identified and reproduced. No fix applied.
**Reported:** 1.9 → 2.0 upgrade, no spec changes. Lollipop chart loses its axis labels.
**Affects:** Vega specs only. Vega-Lite is not affected.

## Symptom

The reporter's axis labels sit at `yscale(0)` with `dy: 15`, i.e. below the data
rectangle, and are positioned entirely in `encode.enter`. After the 2.0 upgrade
they render outside the canvas and disappear. Moving the same encoding into
`encode.update` restores them.

Measuring the two screenshots attached to the issue confirms the geometry:

| | data-rect height | `yscale(0)` | axis labels |
| --- | --- | --- | --- |
| 1.9 | 160.6 px | 277 px | visible at 292 px, card bottom 313 px |
| 2.0 | 176.9 px | 303 px | would sit at 318 px, card bottom 319 px |

The visual container is identical in both (283 × 283) and the horizontal
geometry is identical to sub-pixel. Only the vertical scale range grew — by
about 10%, or 16 px.

## Root cause

Two things changed between 1.9 and 2.0, and they are only harmful together.

**1. Sizing moved onto the mutable container object.**

1.9 patched a Vega spec's dimensions from dedicated scalar signals, seeded from
Vega's own `containerSize()`:

```jsonc
"width":  { "signal": "pbiContainerWidth" },   // update: containerSize()[0]
"height": { "signal": "pbiContainerHeight" },  // update: containerSize()[1]
"signals": [{ "name": "pbiContainer", "value": { /* box + scroll state */ } }]
```

`pbiContainer` carried the box and scroll state for specs to read, but nothing
in the sizing path referenced it. Writing it could not perturb the layout.

2.0 consolidated the two into one object
([`patch-vega.ts`](../../../packages/vega-runtime/src/lib/spec-processing/patch-vega.ts)):

```jsonc
"width":  { "signal": "denebContainer.width" },
"height": { "signal": "denebContainer.height" },
"signals": [{ "name": "denebContainer", "value": { /* box + scroll state */ } }]
```

`height` now has an **update expression over the same object the runtime
writes**. Every write to `denebContainer` — including one that changes only
`scrollTop` — re-evaluates `height`.

**2. `autosize: fit` writes back to `height`, and that write is clobbered.**

`{ "autosize": { "contains": "padding", "type": "fit" } }` is the config Deneb
stamps into every new Vega spec
(`getDenebTemplateVegaSpecificConfig`, in the `catalog/vega` module —
`app-core` on the 2.0.x line, `editor` on `main`).
Under `fit`, Vega shrinks the data rectangle so the whole scenegraph fits the
given size, and it does so by **writing the corrected value into the `height`
signal** — here 283 → 232.

When `denebContainer` is next written, `height`'s update expression fires and
snaps it back to the raw container height (283). Vega then re-fits by
subtracting the current scene overflow. But the overflowing marks are
`encode.enter`-only, so they never move — the overflow Vega measures still
belongs to the *previous* fit. The correction is applied twice over and lands
on a wrong, self-consistent fixed point (252 instead of 232), permanently 20 px
too tall. The marks stay where they were; the bottom of the chart falls outside
the canvas.

**3. The trigger fires on every view, not just on resize.**

`useContainerSignalOwner`'s post-embed reconcile writes `denebContainer` once
for every fresh view, to seed `scrollWidth`/`scrollHeight` — the compile-time
init leaves them at 0
([`use-container-signal-owner.ts`](../../../packages/app-core/src/features/visual-viewer/use-container-signal-owner.ts)).
That write is value-different even when the box is unchanged, so the drift is
deterministic on every load. No resize or scroll is required.

## Reproduction

`repro.mjs` in this directory reproduces it headlessly. Run it from a checkout
with dependencies installed (it resolves `vega` from `node_modules`):

```
node docs/audits/2026-09-25-issue-773-sizing-regression/repro.mjs
```

Writing `denebContainer` with an **identical** width and height — only the
scroll extents differ — is enough:

```
enter-encoded + width/height bound to the denebContainer object
   at embed:          height=245 dataRectHeight=196 sceneBottom=265
   after scroll seed: height=265 dataRectHeight=212 sceneBottom=285   *** DRIFT ***

update-encoded + width/height bound to the denebContainer object   stable
enter-encoded + width/height as literals                           stable
```

## Blast radius

Drift requires all three of:

- provider is Vega (Vega-Lite sizes with `"container"` and never binds
  `width`/`height` to `denebContainer`),
- `autosize` fits the affected axis — `fit`, `fit-x`, `fit-y`. `pad` (the Vega
  default) and `none` do not write back to the size signals and are unaffected,
- the scenegraph overflows the data rectangle on that axis, and the overflowing
  marks are positioned in `encode.enter`.

Measured across autosize modes at the reporter's geometry:

| autosize | drift after a scroll-only write |
| --- | --- |
| absent / `pad` / `none` / `fit-x` | 0 px |
| `fit`, `fit` + `contains: content`, `fit-y` | +20 px |

`fit` is Deneb's default for new Vega specs, so this is not an exotic
combination.

## Candidate fixes

Both were validated in `repro.mjs`; both hold the layout stable.

1. **Patch `width`/`height` as literal numbers rather than signal references.**
   The
   [container-signal consolidation design, Revision 2](../../plans/2026-07-23-001-container-signal-consolidation-design.md)
   already decided that geometry changes go through a cheap re-embed rather than
   a signal write, so the patched dimensions no longer need to be reactive —
   `updateContainerInitDimensions` re-stamps them and the view is rebuilt. This
   also lets `autosize: fit`'s write-back survive, which is the actual defect.
   It needs `updateContainerInitDimensions` to rewrite the literals alongside the
   signal init.

2. **Keep signal references, but point them at dedicated scalar signals**
   (`denebContainerWidth` / `denebContainerHeight`) that only a re-embed
   changes. Structurally identical to 1.9. Costs two more names in the user's
   signal namespace.

Option 1 is the smaller change and removes the reactive path entirely rather
than routing around it.

## Secondary finding

`refreshScrollSignal` reads and writes all six fields, including `width` and
`height`, from the measured element. The design's contract is that the scroll
channel carries offsets only and that geometry goes through
`refreshContainerDimensions`; the code comment justifies this on the grounds
that "the box matches the init by construction here". In the post-embed
reconcile both run back-to-back, and the scroll write lands on the live view
synchronously, before the geometry re-embed has been committed — so a box change
does reach the view through the signal channel first. Neither candidate fix
depends on this, but it is the same contract violation that makes the defect
possible.
