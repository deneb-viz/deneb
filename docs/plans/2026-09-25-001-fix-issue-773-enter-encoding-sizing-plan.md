# Issue #773 Sizing Fix and 2.0.1 Patch Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop enter-encoded Vega geometry going stale when the `denebContainer` signal is written, and prepare the 2.0.1 release to be tagged and published from `certification`.

**Architecture:** A patched Vega spec's `width`/`height` become literal numbers instead of `denebContainer.*` signal references, so `autosize: fit`'s write-back is no longer clobbered. Because literals cannot be distinguished from user-authored ones, the patch step reports which dimensions it stamped; that flag travels on the compilation result and lets the cheap re-embed path re-stamp only Deneb's own. Three release-hygiene changes make a 2.0.x dispatch fail loudly rather than confusingly.

**Tech Stack:** TypeScript, Vega 6, Vitest, GitHub Actions.

**Spec:** [docs/brainstorms/2026-09-25-issue-773-patch-release-requirements.md](../brainstorms/2026-09-25-issue-773-patch-release-requirements.md)
**Root cause analysis:** [docs/audits/2026-09-25-issue-773-sizing-regression/](../audits/2026-09-25-issue-773-sizing-regression/README.md)

**Branch:** `fix/773-enter-encoding-sizing`, cut from `certification`. This is the 2.0.x line — `pbiviz.json` is at the repository root here, not under `apps/deneb/`.

> **Tasks 3–7 are one functional unit.** After Task 3 the spec carries literal dimensions but nothing re-stamps them on a container change, so a resize re-embeds at stale dimensions — worse than the reported bug. Do not build for Desktop, and do not run the validation gates, until Task 7 is committed.

---

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `packages/vega-runtime/src/lib/signals/deneb-container.ts` | Container signal shape, and the immutable re-stamp helper used by the cheap re-embed path. Owns `ContainerDimensions`, and gains `PatchedDimensions`. | Modify |
| `packages/vega-runtime/src/lib/signals/index.ts` | Public signal exports. | Modify |
| `packages/vega-runtime/src/lib/spec-processing/patch-vega.ts` | Applies Deneb's patches to a Vega spec. Gains the ownership predicate and stamps literals. | Modify |
| `packages/vega-runtime/src/lib/spec-processing/types.ts` | Spec-processing contracts. `ParsedSpec` gains `patchedDimensions`. | Modify |
| `packages/vega-runtime/src/lib/spec-processing/parse.ts` | Parse pipeline. Populates `patchedDimensions` on every result. | Modify |
| `packages/vega-runtime/src/lib/spec-processing/__tests__/container-dimension-stability.test.ts` | Regression test: runs a real Vega view and pins that a container signal write does not move the layout. Separate from the patch unit tests because it needs a live `View`. | Create |
| `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega.test.ts` | Unit tests for `patchVegaSpec`. | Modify |
| `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts` | Unit tests for `parseSpec`, which calls `patchVegaSpec` and asserts the resulting dimension shape. | Modify |
| `packages/vega-runtime/src/lib/signals/__tests__/deneb-container.test.ts` | Unit tests for the signal helpers. | Modify |
| `packages/app-core/src/state/compilation.ts` | Compilation slice. Passes ownership into the re-stamp helper. | Modify |
| `pbiviz.json` | Version source of truth. | Modify |
| `.github/workflows/release.yml` | Draft-release dispatch. Gains a layout guard and a corrected header. | Modify |
| `CLAUDE.md` | Branching and release guidance. | Modify |

---

### Task 1: Pin the defect with a regression test

The existing suite cannot see this bug: it tests `patchVegaSpec`'s output shape, never runs a Vega view, and never writes the signal after the first run. This test does all three.

**Files:**

- Create: `packages/vega-runtime/src/lib/spec-processing/__tests__/container-dimension-stability.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { parse, View, type Spec } from 'vega';
import { patchVegaSpec } from '../patch-vega';
import { SIGNAL_DENEB_CONTAINER } from '../../signals';

const CONTAINER = { width: 267, height: 283 };

/**
 * `autosize: fit` makes Vega write its fitted value into the `height` signal.
 * Marks positioned in `encode.enter` run once per datum for the life of the
 * view, so anything that resets `height` re-fits against a scenegraph that
 * has not moved.
 */
const FIT_CONFIG = { autosize: { type: 'fit', contains: 'padding' } };

/**
 * A text mark below the data rectangle, positioned entirely in `encode.enter`
 * — the shape from issue #773. `yscale(0)` sits below the domain minimum, so
 * the label overflows and the fit has something to correct for.
 */
const OVERFLOWING_ENTER_SPEC: Spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    padding: { top: 10 },
    data: [
        {
            name: 'dataset',
            values: [
                { category: 'a', amount: 10 },
                { category: 'b', amount: 50 }
            ]
        }
    ],
    scales: [
        {
            name: 'yscale',
            domain: { data: 'dataset', field: 'amount' },
            range: 'height'
        }
    ],
    marks: [
        {
            type: 'text',
            from: { data: 'dataset' },
            encode: {
                enter: {
                    text: { value: 'label' },
                    y: { scale: 'yscale', value: 0 },
                    baseline: { value: 'middle' },
                    dy: { value: 15 }
                }
            }
        }
    ]
};

const runPatchedView = async (containerDimensions: {
    width: number;
    height: number;
}) => {
    const spec = patchVegaSpec(OVERFLOWING_ENTER_SPEC, { containerDimensions });
    const view = new View(parse(spec, FIT_CONFIG), { renderer: 'none' });
    await view.runAsync();
    return view;
};

describe('container dimension stability', () => {
    it('leaves the fitted layout unchanged when only scroll fields are written', async () => {
        const view = await runPatchedView(CONTAINER);
        const heightAtEmbed = view.signal('height');
        const widthAtEmbed = view.signal('width');

        // Every fresh view gets exactly this write from the post-embed
        // reconcile: the box is unchanged, and the scroll extents move off the
        // compile-time seed of 0.
        view.signal(SIGNAL_DENEB_CONTAINER, {
            width: CONTAINER.width,
            height: CONTAINER.height,
            scrollWidth: CONTAINER.width,
            scrollHeight: 300,
            scrollTop: 0,
            scrollLeft: 0
        });
        await view.runAsync();

        expect(view.signal('height')).toBe(heightAtEmbed);
        expect(view.signal('width')).toBe(widthAtEmbed);
    });

    it('fits the overflowing label inside the view', async () => {
        const view = await runPatchedView(CONTAINER);

        view.signal(SIGNAL_DENEB_CONTAINER, {
            width: CONTAINER.width,
            height: CONTAINER.height,
            scrollWidth: CONTAINER.width,
            scrollHeight: 300,
            scrollTop: 0,
            scrollLeft: 0
        });
        await view.runAsync();

        // `fit` guarantees the whole scenegraph sits inside the requested
        // box; a clobbered fit pushes the bottom of it past that.
        expect(view.scenegraph().root.bounds.y2).toBeLessThanOrEqual(
            CONTAINER.height
        );
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/spec-processing/__tests__/container-dimension-stability.test.ts` from `packages/vega-runtime`.

Expected: both tests FAIL. The first reports a `height` of `252` against an expected `232`; the second reports a `y2` of about `272` against `283` — close, because `fit` still partly compensates. Record the actual numbers in the commit message for Task 3.

- [ ] **Step 3: Commit the failing test**

```bash
git add packages/vega-runtime/src/lib/spec-processing/__tests__/container-dimension-stability.test.ts
git commit -m "test: pin the enter-encoded container sizing regression (#773)"
```

---

### Task 2: Add the `PatchedDimensions` type

`ContainerDimensions` already lives in `deneb-container.ts`, and `spec-processing` imports from `signals` (never the reverse). `PatchedDimensions` goes in the same place to keep that direction.

**Files:**

- Modify: `packages/vega-runtime/src/lib/signals/deneb-container.ts`
- Modify: `packages/vega-runtime/src/lib/signals/index.ts`

- [ ] **Step 1: Add the type and its default**

In `deneb-container.ts`, directly below the existing `ContainerDimensions` interface:

```typescript
/**
 * Which top-level dimensions Deneb stamped into a patched spec.
 *
 * Deneb only sets `width`/`height` when the user has not — so once they are
 * literal numbers, nothing in the spec distinguishes Deneb's from the user's.
 * This travels alongside the spec so the re-stamp path can tell them apart and
 * leave a user-authored dimension alone.
 */
export interface PatchedDimensions {
    width: boolean;
    height: boolean;
}

/**
 * Deneb stamped neither dimension. The safe default: nothing gets re-stamped.
 */
export const NO_PATCHED_DIMENSIONS: PatchedDimensions = {
    width: false,
    height: false
};
```

- [ ] **Step 2: Export them**

In `packages/vega-runtime/src/lib/signals/index.ts`, extend the existing export block from `./deneb-container`:

```typescript
export {
    getSignalDenebContainer,
    getDenebContainerSignalFromDimensions,
    getContainerSignalReferences,
    updateContainerInitDimensions,
    NO_PATCHED_DIMENSIONS,
    SIGNAL_DENEB_CONTAINER,
    SIGNAL_PBI_CONTAINER_LEGACY,
    type ContainerDimensions,
    type DenebContainerSignal,
    type DenebContainerSignalOptions,
    type PatchedDimensions
} from './deneb-container';
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck -w @deneb-viz/vega-runtime`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add packages/vega-runtime/src/lib/signals/deneb-container.ts packages/vega-runtime/src/lib/signals/index.ts
git commit -m "feat(vega-runtime): add the patched-dimension ownership type (#773)"
```

---

### Task 3: Stamp literal dimensions in `patchVegaSpec`

**Files:**

- Modify: `packages/vega-runtime/src/lib/spec-processing/patch-vega.ts`

- [ ] **Step 1: Replace the file's imports and dimension logic**

Replace the whole of `patch-vega.ts` with:

```typescript
import type { Spec } from 'vega';
import { mergician } from 'mergician';
import {
    getDenebContainerSignalFromDimensions,
    SIGNAL_DENEB_CONTAINER,
    type ContainerDimensions,
    type PatchedDimensions
} from '../signals';
import type { PatchVegaOptions } from './types';

/**
 * Check if a signal with the given name exists in the signals array.
 */
const hasSignalNamed = (spec: Spec, name: string): boolean => {
    return spec.signals?.some((signal) => signal.name === name) ?? false;
};

/**
 * Which top-level dimensions Deneb will stamp for this spec.
 *
 * A dimension is Deneb's only when the user has set neither the property nor a
 * signal of that name — their own definition always wins. Exported so the
 * parse pipeline can record the same answer on the result without repeating
 * the condition.
 */
export const getPatchedVegaDimensions = (
    spec: Spec,
    containerDimensions?: ContainerDimensions
): PatchedDimensions => {
    if (!containerDimensions) {
        return { width: false, height: false };
    }
    return {
        width: spec.width == null && !hasSignalNamed(spec, 'width'),
        height: spec.height == null && !hasSignalNamed(spec, 'height')
    };
};

/**
 * Apply Deneb-specific patches to a Vega specification.
 *
 * Patches applied:
 * 1. Adds denebContainer signal with container dimensions
 * 2. Sets responsive width/height if not specified (and no user-defined signal exists)
 * 3. Merges additional signals if provided
 *
 * Width and height are stamped as literal numbers rather than references to
 * `denebContainer`. Binding them to the signal gives them an update expression
 * over an object the runtime writes at runtime, which resets whatever
 * `autosize: fit` computed and re-fits against a scenegraph whose
 * `encode.enter` marks never moved. Container changes reach the view through a
 * re-embed, not a signal write, so these do not need to be reactive.
 *
 * @param spec The Vega specification to patch
 * @param options Patching options
 * @returns A new patched Vega specification
 *
 * @example
 * ```typescript
 * const patched = patchVegaSpec(userSpec, {
 *   containerDimensions: { width: 800, height: 600 }
 * });
 * ```
 */
export const patchVegaSpec = (
    spec: Spec,
    options: PatchVegaOptions = {}
): Spec => {
    const { containerDimensions, additionalSignals = [] } = options;

    // Build patches object
    const patches: Partial<Spec> = {
        // Add denebContainer signal, unless the user spec already defines one
        // (user definition wins, consistent with width/height handling below)
        signals: [
            ...(spec.signals || []),
            ...(hasSignalNamed(spec, SIGNAL_DENEB_CONTAINER)
                ? []
                : [getDenebContainerSignalFromDimensions(containerDimensions)]),
            ...additionalSignals
        ]
    };

    if (containerDimensions) {
        const patchedDimensions = getPatchedVegaDimensions(
            spec,
            containerDimensions
        );
        if (patchedDimensions.width) {
            patches.width = containerDimensions.width;
        }
        if (patchedDimensions.height) {
            patches.height = containerDimensions.height;
        }
    }

    // Merge patches with original spec (non-mutating)
    return mergician(spec, patches) as Spec;
};
```

- [ ] **Step 2: Run the regression test to verify it now passes**

Run: `npx vitest run src/lib/spec-processing/__tests__/container-dimension-stability.test.ts` from `packages/vega-runtime`.
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/patch-vega.ts
git commit -m "fix(vega-runtime): stamp literal dimensions into patched Vega specs (#773)"
```

---

### Task 4: Update the existing dimension-shape expectations

Six tests across two files assert the signal-reference form and now fail. The rest of both files is unaffected.

**Files:**

- Modify: `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega.test.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts:129-130`

- [ ] **Step 1: Run both suites to see exactly which fail**

Run, from `packages/vega-runtime`:

```
npx vitest run src/lib/spec-processing/__tests__/patch-vega.test.ts src/lib/spec-processing/__tests__/parse.test.ts
```

Expected: 6 failures, each reporting `expected 800 to have property "signal"` or `expected 600 to have property "signal"`.

In `patch-vega.test.ts`:

- `should set responsive width if not specified`
- `should set responsive height if not specified`
- `should not add responsive width when user has width signal with init`
- `should not add responsive height when user has height signal with init`
- `patchVegaSpec Integration > should work with realistic bar chart spec`

In `parse.test.ts`:

- `parseSpec > should apply responsive sizing when containerDimensions provided`

- [ ] **Step 2: Update the four assertions**

In `should set responsive width if not specified`, replace:

```typescript
        expect(patched.width).toBeDefined();
        expect(patched.width).toHaveProperty('signal');
        expect((patched.width as any).signal).toContain('denebContainer.width');
```

with:

```typescript
        expect(patched.width).toBe(800);
```

In `should set responsive height if not specified`, replace:

```typescript
        expect(patched.height).toBeDefined();
        expect(patched.height).toHaveProperty('signal');
        expect((patched.height as any).signal).toContain(
            'denebContainer.height'
        );
```

with:

```typescript
        expect(patched.height).toBe(600);
```

In `should not add responsive width when user has width signal with init`, replace:

```typescript
        // Should still add responsive height since no height signal exists
        expect(patched.height).toHaveProperty('signal');
```

with:

```typescript
        // Should still add responsive height since no height signal exists
        expect(patched.height).toBe(600);
```

In `should not add responsive height when user has height signal with init`, replace:

```typescript
        // Should still add responsive width since no width signal exists
        expect(patched.width).toHaveProperty('signal');
```

with:

```typescript
        // Should still add responsive width since no width signal exists
        expect(patched.width).toBe(800);
```

In `patchVegaSpec Integration > should work with realistic bar chart spec`, replace:

```typescript
        expect(patched.width).toHaveProperty('signal');
        expect(patched.height).toHaveProperty('signal');
```

with:

```typescript
        expect(patched.width).toBe(800);
        expect(patched.height).toBe(600);
```

- [ ] **Step 2a: Update the `parseSpec` expectation**

`parseSpec` calls `patchVegaSpec`, so it asserts the same shape. In `parse.test.ts`, in `should apply responsive sizing when containerDimensions provided`, replace lines 129-130:

```typescript
        expect(specObj.width).toHaveProperty('signal');
        expect(specObj.height).toHaveProperty('signal');
```

with:

```typescript
        expect(specObj.width).toBe(800);
        expect(specObj.height).toBe(600);
```

- [ ] **Step 3: Add coverage for the ownership predicate**

Add this import at the top of the file, alongside the existing `patchVegaSpec` import:

```typescript
import { getPatchedVegaDimensions, patchVegaSpec } from '../patch-vega';
```

(remove the now-duplicated `import { patchVegaSpec } from '../patch-vega';` line)

Add a new `describe` block at the end of the file:

```typescript
describe('getPatchedVegaDimensions', () => {
    const containerDimensions = { width: 800, height: 600 };

    it('claims both dimensions when the user sets neither', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };

        expect(getPatchedVegaDimensions(spec, containerDimensions)).toEqual({
            width: true,
            height: true
        });
    });

    it('yields a dimension the user set as a property', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 400,
            marks: []
        };

        expect(getPatchedVegaDimensions(spec, containerDimensions)).toEqual({
            width: false,
            height: true
        });
    });

    it('yields a dimension the user set to zero', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            height: 0,
            marks: []
        };

        expect(getPatchedVegaDimensions(spec, containerDimensions)).toEqual({
            width: true,
            height: false
        });
    });

    it('yields a dimension the user defined as a signal', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            signals: [{ name: 'height', value: 300 }],
            marks: []
        };

        expect(getPatchedVegaDimensions(spec, containerDimensions)).toEqual({
            width: true,
            height: false
        });
    });

    it('claims nothing without container dimensions', () => {
        const spec: Spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };

        expect(getPatchedVegaDimensions(spec)).toEqual({
            width: false,
            height: false
        });
    });
});
```

- [ ] **Step 4: Run the whole package suite to verify it passes**

Run: `npm run test -w @deneb-viz/vega-runtime`
Expected: 0 failures, including the 5 new `getPatchedVegaDimensions` cases. Running the whole package rather than the two files catches any further site that asserts the old shape — Task 3 found two the plan had missed, so do not assume this list is complete.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega.test.ts packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts
git commit -m "test(vega-runtime): cover literal dimension stamping and ownership (#773)"
```

---

### Task 5: Report ownership from the parse pipeline

**Files:**

- Modify: `packages/vega-runtime/src/lib/spec-processing/types.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/parse.ts:73,83,93-100,129,138`

- [ ] **Step 1: Add the field to `ParsedSpec`**

In `types.ts`, add this import at the top:

```typescript
import type { PatchedDimensions } from '../signals';
```

Then add the field to the `ParsedSpec` interface, after `warnings`:

```typescript
    /**
     * Which top-level dimensions Deneb stamped into `spec`. Only these may be
     * re-stamped when the container changes; a user-supplied `width`/`height`
     * is theirs to keep. Always `{ width: false, height: false }` for an error
     * result and for Vega-Lite, which sizes with `'container'` instead.
     */
    patchedDimensions: PatchedDimensions;
```

- [ ] **Step 2: Populate it at every return site in `parseSpec`**

In `parse.ts`, add to the existing `../signals` import:

```typescript
import {
    replaceLegacySignalReferences,
    logLegacySignalWarning,
    NO_PATCHED_DIMENSIONS
} from '../signals';
```

and import the predicate alongside the existing `patchVegaSpec` import:

```typescript
import { getPatchedVegaDimensions, patchVegaSpec } from './patch-vega';
```

Add `patchedDimensions: NO_PATCHED_DIMENSIONS,` to each of the three error returns (the JSON spec parse error at line 73, the config parse error at line 83, and the compiler/parser failure at line 129). For example, the first becomes:

```typescript
        return {
            status: 'error',
            spec: null,
            config: null,
            errors: ['Specification JSON parse error:', ...parsedSpec.errors],
            warnings,
            patchedDimensions: NO_PATCHED_DIMENSIONS
        };
```

Capture the answer where the spec is patched (Step 3, around line 93):

```typescript
    // Step 3: Patch spec with denebContainer and responsive sizing
    const patchedDimensions =
        provider === 'vega'
            ? getPatchedVegaDimensions(
                  parsedSpec.result as Spec,
                  containerDimensions
              )
            : NO_PATCHED_DIMENSIONS;
    const patchedSpec =
        provider === 'vega'
            ? patchVegaSpec(parsedSpec.result as Spec, {
                  containerDimensions
              })
            : patchVegaLiteSpec(parsedSpec.result as TopLevelSpec, {
                  containerDimensions
              });
```

And return it on success (line 138):

```typescript
    return {
        status: 'valid',
        spec: patchedSpec,
        config: parsedConfig.result,
        errors: [],
        warnings,
        patchedDimensions
    };
```

- [ ] **Step 3: Verify the compiler finds no other construction sites**

Run: `npm run typecheck -w @deneb-viz/vega-runtime`
Expected: exit 0. A non-zero exit naming a missing `patchedDimensions` property is a construction site this step missed — add `patchedDimensions: NO_PATCHED_DIMENSIONS` there and re-run.

- [ ] **Step 4: Run the package suite**

Run: `npm run test -w @deneb-viz/vega-runtime`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/types.ts packages/vega-runtime/src/lib/spec-processing/parse.ts
git commit -m "feat(vega-runtime): carry patched-dimension ownership on the parse result (#773)"
```

---

### Task 6: Re-stamp owned dimensions on a container change

Without this the re-embed rebuilds the view from a spec whose literals still hold the compile-time dimensions, so a resize would render at the old size.

**Files:**

- Modify: `packages/vega-runtime/src/lib/signals/deneb-container.ts`
- Test: `packages/vega-runtime/src/lib/signals/__tests__/deneb-container.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this as a new top-level `describe` block at the end of `deneb-container.test.ts`. The file already exercises `updateContainerInitDimensions`; confirm `updateContainerInitDimensions` and `SIGNAL_DENEB_CONTAINER` are both in its import list and add whichever is missing.

```typescript
describe('updateContainerInitDimensions with owned dimensions', () => {
    const baseSpec = {
        width: 800,
        height: 600,
        signals: [
            {
                name: SIGNAL_DENEB_CONTAINER,
                value: {
                    width: 800,
                    height: 600,
                    scrollWidth: 0,
                    scrollHeight: 0,
                    scrollTop: 0,
                    scrollLeft: 0
                }
            }
        ]
    };

    it('re-stamps both dimensions when Deneb owns them', () => {
        const updated = updateContainerInitDimensions(
            baseSpec,
            { width: 1024, height: 768 },
            { width: true, height: true }
        );

        expect(updated.width).toBe(1024);
        expect(updated.height).toBe(768);
    });

    it('leaves a user-owned dimension alone', () => {
        const updated = updateContainerInitDimensions(
            baseSpec,
            { width: 1024, height: 768 },
            { width: false, height: true }
        );

        expect(updated.width).toBe(800);
        expect(updated.height).toBe(768);
    });

    it('re-stamps nothing when ownership is not supplied', () => {
        const updated = updateContainerInitDimensions(baseSpec, {
            width: 1024,
            height: 768
        });

        expect(updated.width).toBe(800);
        expect(updated.height).toBe(600);
        // The signal init is still rewritten — that is not owned by the caller.
        expect(
            (
                updated.signals?.find(
                    (signal) => signal.name === SIGNAL_DENEB_CONTAINER
                )?.value as { width: number }
            ).width
        ).toBe(1024);
    });

    it('returns the input reference when an owned dimension is already correct', () => {
        const updated = updateContainerInitDimensions(
            baseSpec,
            { width: 800, height: 600 },
            { width: true, height: true }
        );

        expect(updated).toBe(baseSpec);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/signals/__tests__/deneb-container.test.ts` from `packages/vega-runtime`.
Expected: the first two FAIL — `updateContainerInitDimensions` takes two arguments and never touches `width`/`height`, so both return `800`/`600`. The third and fourth pass already.

- [ ] **Step 3: Extend the helper**

In `deneb-container.ts`, replace the `updateContainerInitDimensions` signature, doc comment and return block:

```typescript
/**
 * Immutably rewrite the stored `denebContainer` entry's init width/height in a
 * patched spec — `spec.signals` (Vega) or `spec.params` (Vega-Lite); both use
 * the same `{ name, value }` shape — and re-stamp the top-level `width`/
 * `height` literals that Deneb owns. Returns the INPUT reference when there is
 * nothing to do (no entry, non-object value, and dims already equal), so
 * callers can use identity to suppress redundant downstream work (the
 * re-embed path keys off object identity).
 *
 * `patchedDimensions` says which top-level dimensions Deneb stamped. A
 * dimension the user set is theirs and is never rewritten; the default claims
 * neither, so a caller that cannot supply ownership changes only the signal.
 *
 * Only `width`/`height` are rewritten: the init's scroll fields are the
 * compile-time seed for a NEW view, and the live view's scroll state is owned
 * by the signal-write path, not this helper.
 */
export const updateContainerInitDimensions = <
    T extends {
        width?: unknown;
        height?: unknown;
        signals?: Array<{ name?: string; value?: unknown }>;
        params?: Array<{ name?: string; value?: unknown }>;
    }
>(
    spec: T,
    dimensions: ContainerDimensions,
    patchedDimensions: PatchedDimensions = NO_PATCHED_DIMENSIONS
): T => {
```

Keep the existing `isPlainObject` and `updateArray` helper bodies unchanged. Replace everything from `const newSignals = updateArray(spec.signals);` to the end of the function with:

```typescript
    const newSignals = updateArray(spec.signals);
    const newParams = updateArray(spec.params);

    const rewriteWidth =
        patchedDimensions.width && spec.width !== dimensions.width;
    const rewriteHeight =
        patchedDimensions.height && spec.height !== dimensions.height;

    if (
        newSignals === spec.signals &&
        newParams === spec.params &&
        !rewriteWidth &&
        !rewriteHeight
    ) {
        return spec;
    }

    return {
        ...spec,
        ...(newSignals !== spec.signals ? { signals: newSignals } : {}),
        ...(newParams !== spec.params ? { params: newParams } : {}),
        ...(rewriteWidth ? { width: dimensions.width } : {}),
        ...(rewriteHeight ? { height: dimensions.height } : {})
    };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/signals/__tests__/deneb-container.test.ts` from `packages/vega-runtime`.
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/signals/deneb-container.ts packages/vega-runtime/src/lib/signals/__tests__/deneb-container.test.ts
git commit -m "fix(vega-runtime): re-stamp Deneb-owned dimensions on a container change (#773)"
```

---

### Task 7: Pass ownership through the compilation slice

**Files:**

- Modify: `packages/app-core/src/state/compilation.ts:418-446`

- [ ] **Step 1: Pass the flag into the helper**

In `handleRefreshContainerDimensions`, change the `updateContainerInitDimensions` call to:

```typescript
    const newSpec = updateContainerInitDimensions(
        spec as Parameters<typeof updateContainerInitDimensions>[0],
        dimensions,
        result.parsed.patchedDimensions
    );
```

- [ ] **Step 2: Extend the doc comment's no-op list**

In the same function's doc comment, replace the third bullet:

```
 * - `updateContainerInitDimensions` returns the same spec reference,
 *   meaning the `denebContainer` init already has these dims (or there is
 *   no such entry to rewrite).
```

with:

```
 * - `updateContainerInitDimensions` returns the same spec reference,
 *   meaning the `denebContainer` init and the Deneb-owned top-level
 *   `width`/`height` already have these dims (or there is nothing to
 *   rewrite).
```

- [ ] **Step 3: Verify the package compiles and its tests pass**

Run: `npm run typecheck -w @deneb-viz/app-core && npm run test -w @deneb-viz/app-core`
Expected: exit 0, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/app-core/src/state/compilation.ts
git commit -m "fix(app-core): re-stamp owned dimensions on the cheap re-embed path (#773)"
```

---

### Task 7a: Cover the app-core ownership wiring

Added after a review of Tasks 2–7 found that `packages/app-core/src/state/__tests__/compilation-refresh-dimensions.test.ts` predates the fix: its `makeReadyResult` builds a `parsed` object with no `patchedDimensions` and no top-level `spec.width`/`spec.height`. The field therefore arrives `undefined`, the default parameter applies, and reading it from the wrong object would pass every test — the one production path the whole fix depends on had no coverage.

**Files:**

- Modify: `packages/app-core/src/state/__tests__/compilation-refresh-dimensions.test.ts`

- [ ] **Step 1: Extend `makeReadyResult` and add three cases**

Follow the file's existing harness rather than replacing it. Add an options parameter carrying `specDimensions` and `patchedDimensions`, keeping the existing call sites working. The three cases:

1. Both dimensions owned → both re-stamped to the new size.
2. `{ width: false, height: true }` → `width` keeps its original value, `height` is re-stamped. This is the guard against ownership being ignored.
3. The `denebContainer` signal init already matches the new size while the owned top-level dimensions differ → the dimensions are re-stamped and `spec.signals` comes back as the same object reference, proving only the dimension branch fired.

- [ ] **Step 2: Prove the coverage is real with a mutation test**

Temporarily change the call in `packages/app-core/src/state/compilation.ts` to read `result.patchedDimensions` (the wrong object) instead of `result.parsed.patchedDimensions`, run the file, and confirm the new tests fail. Then `git checkout -- packages/app-core/src/state/compilation.ts` and confirm `git diff` is empty.

Expected under the mutation: all three new cases fail with `expected 541 to be 1024` or `expected 352 to be 768`.

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck -w @deneb-viz/app-core && npm run test -w @deneb-viz/app-core`
Expected: exit 0, all pass.

```bash
git add packages/app-core/src/state/__tests__/compilation-refresh-dimensions.test.ts
git commit -m "test(app-core): pin the dimension-ownership wiring on the re-embed path (#773)"
```

---

### Task 8: Bump the version to 2.0.1.0

`pbiviz.json` is the only version to change — the workspace root `package.json` has no `version` field, and `.syncpackrc` governs dependency ranges rather than package versions.

**Files:**

- Modify: `pbiviz.json:7`

- [ ] **Step 1: Bump the version**

Change:

```json
        "version": "2.0.0.0",
```

to:

```json
        "version": "2.0.1.0",
```

- [ ] **Step 2: Verify the version sync check still passes**

Run: `npm run validate-packages-sync`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add pbiviz.json
git commit -m "chore: bump version to 2.0.1.0 (#773)"
```

---

### Task 9: Make a mismatched release dispatch fail loudly

`release.yml` reads its own hard-coded paths from the dispatch ref while checking out the code from the tag. `pbiviz.json` moved under `apps/deneb/` after 2.0.0, so dispatching `main`'s copy against a 2.0.x tag fails deep in the job with a module-not-found.

**Files:**

- Modify: `.github/workflows/release.yml:13-15,55-62,63-77`

- [ ] **Step 1: Correct the header comment**

Replace lines 13-15:

```yaml
# When dispatching, leave the "Use workflow from" selector on main —
# the input tag only selects the code that gets built, not the workflow
# logic.
```

with:

```yaml
# When dispatching, set "Use workflow from" to a branch on the TAG'S line:
# `certification` for a 2.0.x tag, `main` for 2.1 and later. The input tag
# selects the code that gets built, but this file's own paths come from the
# selected ref, and they moved under apps/deneb/ after 2.0.0. The guard in
# the job below names the right ref if they disagree.
```

- [ ] **Step 2: Declare the layout this copy expects**

In the `release` job's `env:` block, after the existing `RELEASE_TAG` entry and its comment, add:

```yaml
            # Where this branch's line keeps pbiviz.json. Kept as a variable so
            # the guard below is identical on every branch and the only
            # forward-merge conflict is this one value.
            PBIVIZ_PATH: pbiviz.json
```

- [ ] **Step 3: Add the guard, and read the path from the variable**

Insert this step immediately before `- name: Validate tag against pbiviz.json and derive title`:

```yaml
            - name: Verify the dispatch ref matches the tag's layout
              run: |
                  if [ -f "$PBIVIZ_PATH" ]; then
                      echo "Layout matches: $PBIVIZ_PATH"
                      exit 0
                  fi
                  for CANDIDATE in pbiviz.json apps/deneb/pbiviz.json; do
                      if [ -f "$CANDIDATE" ]; then
                          echo "::error::Tag '$RELEASE_TAG' keeps pbiviz.json at '$CANDIDATE', but this workflow was dispatched from a ref that expects '$PBIVIZ_PATH'. Re-dispatch with 'Use workflow from' set to a branch on the tag's line."
                          exit 1
                      fi
                  done
                  echo "::error::Tag '$RELEASE_TAG' has no pbiviz.json at any known location."
                  exit 1
```

Then, in the `Validate tag against pbiviz.json and derive title` step, replace:

```yaml
                  PBIVIZ_VERSION=$(node -p "require('./pbiviz.json').visual.version")
```

with:

```yaml
                  PBIVIZ_VERSION=$(node -p "require('./' + process.env.PBIVIZ_PATH).visual.version")
```

- [ ] **Step 4: Verify the YAML parses**

Run: `npx --yes js-yaml .github/workflows/release.yml > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 5: Check the guard logic locally**

Extract the guard's `run:` body verbatim into a scratch file so the check runs
the same script the workflow will, without re-quoting it:

```bash
cat > /tmp/guard.sh <<'SH'
if [ -f "$PBIVIZ_PATH" ]; then
    echo "Layout matches: $PBIVIZ_PATH"
    exit 0
fi
for CANDIDATE in pbiviz.json apps/deneb/pbiviz.json; do
    if [ -f "$CANDIDATE" ]; then
        echo "::error::Tag '$RELEASE_TAG' keeps pbiviz.json at '$CANDIDATE', but this workflow was dispatched from a ref that expects '$PBIVIZ_PATH'. Re-dispatch with 'Use workflow from' set to a branch on the tag's line."
        exit 1
    fi
done
echo "::error::Tag '$RELEASE_TAG' has no pbiviz.json at any known location."
exit 1
SH
```

Then, from the repository root:

```bash
RELEASE_TAG=2.0.1.0 PBIVIZ_PATH=pbiviz.json bash /tmp/guard.sh; echo "exit=$?"
RELEASE_TAG=2.0.1.0 PBIVIZ_PATH=apps/deneb/pbiviz.json bash /tmp/guard.sh; echo "exit=$?"
```

Expected: the first prints `Layout matches: pbiviz.json` and `exit=0`. The
second prints an `::error::` line naming `pbiviz.json` as where the tag keeps
it, and `exit=1`.

Delete `/tmp/guard.sh` afterwards.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: name the right dispatch ref when the release layout mismatches (#773)"
```

---

### Task 10: Record the patch-release flow

**Files:**

- Modify: `CLAUDE.md:238`

- [ ] **Step 1: Rewrite the `certification` bullet**

Replace:

```markdown
- **`certification`** mirrors the version currently published on AppSource. Do not branch off it or target it for routine work — it is reserved for release cuts and genuine production hotfixes, which branch from it and are forward-merged into `main` after shipping.
```

with:

```markdown
- **`certification`** is the branch submitted to Microsoft, and the branch every AppSource release is cut from. Do not branch off it or target it for routine work — it is reserved for release cuts and genuine production hotfixes, which branch from it and are merged back into `main` after shipping. Reconcile with a **merge**, never a cherry-pick: the release tag must stay an ancestor of `main` or the next release's auto-changelog and compare link resolve against unrelated history.
- **Patch releases off `certification`.** Bump `pbiviz.json` `visual.version` only (the workspace root `package.json` has no version). Push the 4-part tag to get a certified artifact from `ci.yml`'s `submission` job, and dispatch the `Release` workflow with **Use workflow from: `certification`** — the workflow file's own paths come from the dispatch ref, and they differ between the 2.0.x layout (root) and `main` (`apps/deneb/`).
```

- [ ] **Step 2: Verify formatting**

Run: `npm run prettier-check -- --end-of-line auto`
Expected: exit 0. If `CLAUDE.md` is reported, run `npm run prettier-format` and re-check.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record the patch-release flow off certification (#773)"
```

---

### Task 11: Full verification and the validation gates

**Files:** none.

- [ ] **Step 1: Run the full local CI**

Run: `npm run ci:local`

This runs, in order: `build`, `validate-packages-sync`, `validate-config-for-commit`, `eslint`, `prettier-check`, `test`, `test:benchmarks`, and `package`.
Expected: every step passes. The `package` step writes `dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.1.0.pbiviz`.

- [ ] **Step 2: Confirm the standalone repro now reports stable**

Run: `node docs/audits/2026-09-25-issue-773-sizing-regression/repro.mjs`
Expected: the first case still reports `*** DRIFT ***` — it builds the old signal-reference shape by hand and is the record of what the defect was, not a test of the current code. The second and third report `stable`. If this is confusing to a reader, leave it; the audit README explains what it models.

- [ ] **Step 3: GATE — Desktop test**

Import `dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.1.0.pbiviz` into Power BI Desktop, open the report attached to issue #773, and confirm the axis labels render. The package carries the production GUID, so it replaces the AppSource visual in that report and picks up its persisted `vega` and `stateManagement` properties unchanged.

Also resize the visual on the canvas and confirm the chart re-lays-out at the new size — this exercises the Task 6 re-stamp, which is the path most at risk from this change.

Do not proceed until both behaviours are confirmed.

- [ ] **Step 4: GATE — reporter confirmation**

Post the same `.pbiviz` to issue #773 and ask the reporter to confirm against their own report. Do not proceed until they reply.

- [ ] **Step 5: Open the pull request**

```bash
git push -u origin fix/773-enter-encoding-sizing
gh pr create --base certification --title "fix: keep enter-encoded Vega geometry stable across container signal writes (#773)"
```

The PR body should link the audit README and the spec, and state that both gates passed.

- [ ] **Step 6: After merge, follow the release path**

The remaining steps are in the spec's **Release path** section: tag `2.0.1.0`, smoke the CI artifact in Desktop, submit to Partner Center, dispatch `Release` with **Use workflow from: `certification`** once approved, then merge `certification` into `main`.

The merge will conflict in `.github/workflows/release.yml` on the `PBIVIZ_PATH` value. Resolve by keeping `main`'s `apps/deneb/pbiviz.json` and taking everything else from `certification`.

---

## Notes for the engineer

**Why literals rather than restoring 1.9's scalar signals.** Both stop the drift. Scalar signals (`denebContainerWidth`/`denebContainerHeight`) would need no ownership plumbing, but they re-add to the user-visible signal namespace the names 2.0 just deprecated away, and a patch release should not leave permanent API surface behind. If the ownership plumbing in Tasks 5 and 7 turns out to be more invasive than it looks, that alternative is the documented fallback — say so rather than inventing a third approach.

**Why ownership cannot be inferred.** It is tempting to have `updateContainerInitDimensions` rewrite any literal that happens to equal the current `denebContainer` init. A user who writes `"width": 400` into a 400px-wide container would then have it silently rewritten on their next resize. The flag exists to make that impossible.

**What is deliberately out of scope.** `refreshScrollSignal` in `packages/app-core/src/features/visual-viewer/use-container-signal-owner.ts` writes box dimensions through the scroll channel, against the contract its own comment states. It is a real finding and it is recorded in the audit README, but neither this fix nor its alternative depends on it, and it belongs to 2.1 on `main`. Do not touch it here.
