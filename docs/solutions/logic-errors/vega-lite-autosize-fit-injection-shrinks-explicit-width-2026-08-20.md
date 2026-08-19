---
title: 'Vega-Lite fit-autosize injection reinterprets explicit width as total chart size, shrinking it'
date: 2026-08-20
category: logic-errors
module: packages/vega-runtime/src/lib/spec-processing
problem_type: logic_error
component: service_object
severity: high
symptoms:
    - "Vega-Lite spec with explicit `width: 380` and no `height` renders with a width signal of 300 instead of 380"
    - 'Horizontal bar chart shrinks by the width of the y-axis labels — plot area drawn narrower than the configured width'
    - "Regression from Deneb 1.9 to 2.0: only reproduces when exactly one dimension is explicit and the other relies on container sizing (both-explicit and both-container configs are unaffected)"
root_cause: logic_error
resolution_type: code_fix
related_components:
    - packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts
    - "vega-lite autosize inference (contains: 'padding')"
tags:
    - vega-lite
    - autosize
    - container-sizing
    - regression
    - width-signal
---

# Vega-Lite fit-autosize injection reinterprets explicit width as total chart size, shrinking it

## Problem

Deneb 2.0 regressed against 1.9 for Vega-Lite specs that mix an explicit dimension with an implicit (container-injected) one. A user's layered bar chart specified `width: 380` and no `height`; in 1.9 this rendered with a width signal of 380 as expected, but in 2.0 the width signal came out as 300 — the plot silently shrank by the y-axis label gutter.

## Symptoms

- A Vega-Lite spec with `width: 380` and no `height` rendered with an inner plot width signal of 300, not 380.
- Only affected specs with exactly one explicit dimension and one container-injected dimension (the mixed case). Specs with both dimensions explicit, or both container-injected, were unaffected — in the "both container" case Vega-Lite infers `{ type: 'fit', contains: 'padding' }` anyway, so the injection was a no-op there.
- Regression versus 1.9 behavior; introduced by the #480 responsive-sizing feature (commit `ee1771c8`, PR #611, April 2026).

## What Didn't Work

Nothing was tried and discarded during the fix itself — systematic root-cause investigation (diffing against 1.9's patching logic in the `1.9.1.0` tag, then an empirical node repro against the pinned vega-lite 6.4.3) led directly to the correct fix on the first attempt.

One alternative was considered and rejected before implementation: injecting per-dimension fit types (`fit-x` / `fit-y`) explicitly instead of removing the injection entirely. Rejected because Vega-Lite's own inference already produces exactly that result — injecting anything would be redundant, and a maintenance liability if Vega-Lite's inference logic changes in a future version.

## Solution

Removed the `autosize` injection from `patchVegaLiteResponsiveSizing` entirely; only `width`/`height` are patched to `'container'` when missing, and `autosize` is left untouched for Vega-Lite to infer.

Before (the injection block that was removed):

```typescript
if (normalized.width === undefined) {
    (patches as any).width = 'container';
    injectingContainerSizing = true;
}

if (normalized.height === undefined) {
    (patches as any).height = 'container';
    injectingContainerSizing = true;
}

if (
    injectingContainerSizing &&
    (normalized as any).autosize === undefined
) {
    (patches as any).autosize = { type: 'fit', contains: 'padding' };
}
```

After (`packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts`):

```typescript
if (normalized.width === undefined) {
    (patches as any).width = 'container';
}

if (normalized.height === undefined) {
    (patches as any).height = 'container';
}
```

The doc comment above the function now records the rationale so a future contributor doesn't reintroduce the same injection:

```typescript
 * `autosize` is deliberately left untouched: Vega-Lite infers it from container sizing
 * with `contains: 'padding'` and the correct per-dimension fit type (`fit`, `fit-x` or
 * `fit-y`), which keeps the #480 fit-including-padding behavior. Injecting a full
 * `{ type: 'fit' }` here broke specs with one explicit dimension — the explicit value
 * was reinterpreted as TOTAL chart size (axes included) instead of inner plot size,
 * shrinking the corresponding width/height signal.
```

TDD process: a failing regression test was written first, two pre-existing tests that asserted the old injected-autosize behavior were updated to assert no injection, then the injection was deleted. All 246 `vega-runtime` tests and all 7 packages' suites (including 655 `app-core` tests) pass. No code outside `vega-runtime` depends on the injected autosize; `app-core`'s `getDenebTemplateVegaSpecificConfig` sets autosize on the Vega (not Vega-Lite) template config, an unrelated path (`patch-vega.ts` was not touched).

## Why This Works

The root cause: `patchVegaLiteResponsiveSizing` injected `autosize: { type: 'fit', contains: 'padding' }` whenever it injected container sizing for *any* missing dimension — not just when both dimensions were containerized. The #480 commit's premise was that "Vega-Lite's default `autosize.contains` is `'content'`" and needed to be forced to `'padding'`.

That premise is empirically false for container-sized Vega-Lite specs. Vega-Lite 6's own spec normalization infers the correct `autosize` per combination of explicit/container dimensions — always `contains: 'padding'`, with the fit type scoped to exactly which axes are containerized (`fit-x` for width-only, `fit-y` for height-only, `fit` for both). By not overriding this inference, an explicit dimension retains Vega-Lite's default interpretation as *inner plot size*, while the containerized dimension still gets `padding`-aware fitting. The prior code forced the *both-containerized* semantics (`fit` covering both axes) onto the *mixed* case, silently redefining what the user's explicit number meant — from inner plot width to total chart width including axes and padding.

The regression test pins this at the compile level, not just the patch level (`packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts`):

```typescript
const patched = patchVegaLiteSpec(spec);

expect(patched.width).toBe(380);
expect(patched.height).toBe('container');
expect((patched as any).autosize).toBeUndefined();
expect(compile(patched).spec.autosize).toEqual({
    type: 'fit-y',
    contains: 'padding'
});
```

— asserting both that Deneb's patch doesn't inject `autosize`, and that Vega-Lite's own `compile()` output resolves to the intended `fit-y` semantics for the mixed-dimension case.

## Prevention

- **Prefer inference over override when patching derived spec properties.** When a patching layer needs to inject one property (e.g. container sizing), resist also overriding *derived* properties (e.g. `autosize`) that the target library computes from it — let the library's own normalization/compile step handle derived semantics unless there's a specific, verified reason to override.
- **Verify library default/inferred behavior empirically, not from memory or code comments.** The #480 commit's premise about Vega-Lite's default `autosize.contains` was wrong for the container-sized-spec case. A minimal node repro against the repo's pinned library version (vega-lite 6.4.3 here) catches this before shipping — do this whenever patching logic makes a claim about "what the library does by default."
- **Mixed explicit/container dimension specs are a required test case for any sizing-related patching change.** The bug only manifested when exactly one dimension was explicit and the other was container-injected; both-explicit and both-container cases were silently fine, which is why it shipped unnoticed. Any future change to `patchVegaLiteResponsiveSizing` (or the analogous pure-Vega path in `patch-vega.ts`) should include the mixed case in its test matrix.
- **Pin inferred semantics with a compile-level assertion**, not just a patch-level one, for sizing-critical paths — `compile(patched).spec.autosize` in the regression test will fail loudly if a future Vega-Lite upgrade changes how it infers `autosize` from container sizing, rather than passing silently while producing wrong pixel dimensions.

## Related Issues

- Issue [#480](https://github.com/deneb-viz/deneb/issues/480) — "How to fill entire Deneb container": the original issue behind commit `ee1771c8` / PR [#611](https://github.com/deneb-viz/deneb/pull/611) that introduced the faulty autosize injection.
- Issue [#745](https://github.com/deneb-viz/deneb/issues/745) — "Crash When Setting Width": adjacent user-facing confusion around explicit width vs. container width; different mechanism, same problem neighborhood.
- [`docs/solutions/ui-bugs/vega-canvas-renderer-vertical-overflow-2026-05-20.md`](../ui-bugs/vega-canvas-renderer-vertical-overflow-2026-05-20.md) — the *other* fix that shipped in the same PR #611 (a CSS line-box overflow with the canvas renderer); unrelated mechanism, shared lineage — a reader debugging PR #611-era sizing weirdness may land on either doc first.
- [`docs/solutions/architecture-patterns/single-owner-container-signal-element-measured-truth-2026-07-23.md`](../architecture-patterns/single-owner-container-signal-element-measured-truth-2026-07-23.md) — background on the `denebContainer` signal machinery in the same sizing neighborhood.
