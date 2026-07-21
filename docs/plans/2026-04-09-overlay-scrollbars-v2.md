# Overlay Scrollbars v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two bugs remaining from the 2026-04-08 overlay-scrollbars work: (1) the Vega SVG renders 10px larger than its container on fitted specs, and (2) the native scroll container's scrollbars render as browser defaults with gutter reserved. Issue #480.

**Architecture:** Two independent layers. Layer 1 patches `autosize: { type: 'fit', contains: 'padding' }` into Vega-Lite specs that Deneb injects container sizing into, so the rendered SVG (including padding) fits the container exactly. Layer 2 replaces the native `<div>` scroll containers in `visual-viewer.tsx` and `preview-area.tsx` with `<OverlayScrollbarsComponent>` from `overlayscrollbars-react`, giving true overlay behavior (zero gutter reservation) and fully user-styled scrollbars. A shared `getScrollbarStyleVars` helper maps the four user-configurable display settings to the library's CSS custom properties.

**Tech Stack:** TypeScript, React 19, Griffel (`makeStyles`/`mergeClasses` from `@fluentui/react-components`), `@uidotdev/usehooks` (`useThrottle`), Vega-Lite 6, `overlayscrollbars` v2 + `overlayscrollbars-react` (new), Vitest.

**Design spec:** [`docs/superpowers/specs/2026-04-09-overlay-scrollbars-v2-design.md`](../specs/2026-04-09-overlay-scrollbars-v2-design.md). Refer to it for full rationale; this plan is the execution-level breakdown.

---

## Pre-flight context

Read these before starting Task 1:

1. The current state of the branch `feat/scrollbars-container-fit`. Key existing commits (do not revert):
   - `9b8d449b feat(app-core): add scrollbarWidth as user-configurable display property` — threads the 5th user setting through the state slice, capability schema, i18n, persistence, and sync layers. All that work stays valid.
   - `dcbaf06d fix(app-core): replace react-custom-scrollbars-2 with native overlay scrollbars` — this is the work being improved here.
   - `0237c2ef chore(app-core): remove react-custom-scrollbars-2 dependency` — stays removed.
   - `3b9c2fad refactor(app-core): remove VEGA_VIEWPORT_ADJUST workaround` — stays removed.

2. Unstaged files at the start of the plan (from the failed 2026-04-08 fix attempt). Treat these as **inputs** to modify, not as extra changes to preserve:
   - `packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts` — has a `padding: 0` injection that Task 1 replaces.
   - `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts` — has two new `padding: 0` tests that Task 1 replaces.
   - `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx` — has an `overflow: 'overlay' as 'auto'` hack that Task 4 replaces.

3. The commit workflow: **never run `git commit` directly** — the user's commits require GPG signing. Each task's commit step stages files and presents the commit message for the user to action.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts` | **Modify** | Replace `padding: 0` injection with `autosize: { type: 'fit', contains: 'padding' }` injection |
| `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts` | **Modify** | Replace padding tests with autosize tests |
| `packages/app-core/package.json` | **Modify** | Add `overlayscrollbars` + `overlayscrollbars-react` dependencies |
| `packages/app-core/src/lib/scrollbars/scrollbar-style-vars.ts` | **Create** | Shared helper: `addAlpha` + `getScrollbarStyleVars` |
| `packages/app-core/src/lib/scrollbars/__tests__/scrollbar-style-vars.test.ts` | **Create** | Unit tests for the shared helper |
| `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx` | **Modify** | Replace `useScrollContainerStyles` + native `<div>` with `<OverlayScrollbarsComponent>`, wire scroll events + container ID |
| `packages/app-core/src/features/preview-area/components/preview-area.tsx` | **Modify** | Replace `shorthands.overflow('overlay')` with `<OverlayScrollbarsComponent>`, subscribe to user scrollbar settings |
| `packages/app-core/src/lib/scrollbars/index.ts` | **Modify** | Remove `getOverlayScrollbarStyles` exports, add `getScrollbarStyleVars` + `addAlpha` exports |
| `packages/app-core/src/lib/scrollbars/overlay-styles.ts` | **Delete** | Factory is unused; replaced by `scrollbar-style-vars.ts` |
| `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts` | **Delete** | Tests for the deleted factory |
| `package-lock.json` | **Modify** (via npm install) | Lockfile update after adding deps |

---

## Task 1: Layer 1 — fix the 10px SVG overflow via `autosize.contains: 'padding'`

This is the **primary bug fix** and is independent of everything else. Once this lands, fitted specs will genuinely fit their container. The scrollbar changes in later tasks only matter for specs that *legitimately* overflow.

**Files:**
- Modify: `packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts`

**Background (from the spec, §2):** When Deneb injects `width: 'container'` and `height: 'container'` into a Vega-Lite spec, Vega-Lite's `autosize.contains` defaults to `'content'`. That means the chart *interior* is set to the container dimensions, and the default `padding: 5` is added on all sides *outside* the chart area — producing an SVG that is `container + 2×padding` (10px larger in both dimensions). Setting `autosize: { type: 'fit', contains: 'padding' }` makes the *total* rendered size (including padding) fit within the container. Padding itself is preserved, so a user who sets `padding: 10` gets a visible 10px inset inside the chart area, not an extra 20px outside it.

**Why the old `padding: 0` approach failed:** zeroing padding only works if `autosize.contains` is also honoured. Without the `contains: 'padding'` fix, Vega-Lite's layout math still adds external offsets in the container-sizing code path. The old test asserted that `patched.padding === 0` was set on the VL spec — which it correctly was — but the symptom (10px overflow) persisted because of the deeper `autosize` default.

### Step 1: Read the current state of `patch-vega-lite.ts`

- [ ] **Step 1.1: Read the file to see the unstaged `padding: 0` code**

Run:
```bash
cat packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts
```

Expected: The file currently contains an `if (injectingContainerSizing && normalized.padding === undefined)` block that sets `(patches as any).padding = 0`. This is the unstaged change to be replaced.

### Step 2: Replace the padding injection with autosize injection

- [ ] **Step 2.1: Edit `patchVegaLiteResponsiveSizing` to inject `autosize` instead of `padding`**

Open `packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts`.

Replace the current `patchVegaLiteResponsiveSizing` function with:

```typescript
/**
 * Apply responsive container sizing to a Vega-Lite specification.
 *
 * For standard layouts (no concat/hconcat/vconcat/facet), sets `width` and/or `height`
 * to `'container'` if not already specified. Non-standard layouts are returned unchanged.
 *
 * When container-based sizing is injected, also injects
 * `autosize: { type: 'fit', contains: 'padding' }` so the rendered SVG (including padding)
 * fits within the container. Without this, Vega-Lite's default `autosize.contains = 'content'`
 * causes the SVG to be `container + 2 × padding` in both dimensions — visible as unwanted
 * scrollbars on fitted specs (issue #480).
 *
 * User-specified `autosize` is never overridden.
 *
 * This is separated from the full patching so it can be used independently — e.g. when
 * compiling a clean Vega spec for the "Edit Vega Spec" feature, where we need container
 * sizing in the output but don't want the `denebContainer` signal injected.
 *
 * @param spec The Vega-Lite specification
 * @returns A new specification with responsive sizing applied (or the original if unchanged)
 */
export const patchVegaLiteResponsiveSizing = (
    spec: TopLevelSpec
): TopLevelSpec => {
    if (isNonStandardLayout(spec)) return spec;

    const normalized = spec as ReturnType<typeof normalize>;
    const patches: Partial<TopLevelSpec> = {};
    let injectingContainerSizing = false;

    if (normalized.width === undefined) {
        (patches as any).width = 'container';
        injectingContainerSizing = true;
    }

    if (normalized.height === undefined) {
        (patches as any).height = 'container';
        injectingContainerSizing = true;
    }

    // When Deneb injects container-based sizing, also inject an autosize that fits
    // the total rendered size (including padding) within the container. Vega-Lite's
    // default `autosize.contains` is `'content'`, which places padding OUTSIDE the
    // container-specified dimensions, producing an SVG that is 2×padding larger than
    // the container on each axis. `contains: 'padding'` fits padding INSIDE instead.
    // See #480 and docs/superpowers/specs/2026-04-09-overlay-scrollbars-v2-design.md §2.
    // User-specified `autosize` is preserved.
    if (
        injectingContainerSizing &&
        (normalized as any).autosize === undefined
    ) {
        (patches as any).autosize = { type: 'fit', contains: 'padding' };
    }

    return Object.keys(patches).length > 0
        ? (mergician(spec, patches) as TopLevelSpec)
        : spec;
};
```

Verification: the `injectingContainerSizing && normalized.padding === undefined` block is gone, replaced by the `injectingContainerSizing && normalized.autosize === undefined` block.

### Step 3: Replace the unstaged padding tests with autosize tests

- [ ] **Step 3.1: Delete the two unstaged padding tests**

Open `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts`.

Find and delete these two tests (they are the unstaged additions from the 2026-04-08 session):

```typescript
it('should set padding to 0 when injecting container sizing', () => {
    // Vega-Lite treats 'container' as inner chart width, so the outer SVG becomes
    // innerWidth + 2*padding (default 5) = container + 10px → triggers scrollbars.
    // Zeroing padding ensures the outer SVG matches the container exactly.
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    };

    const patched = patchVegaLiteSpec(spec);

    expect((patched as any).padding).toBe(0);
});

it('should preserve user-specified padding when injecting container sizing', () => {
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        padding: 10,
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    } as TopLevelSpec;

    const patched = patchVegaLiteSpec(spec);

    expect((patched as any).padding).toBe(10);
});
```

- [ ] **Step 3.2: Add the new autosize tests in their place**

At the same location (immediately after the `'should set container height for standard layout'` test), insert:

```typescript
it('should inject autosize { type: fit, contains: padding } when injecting container sizing', () => {
    // Vega-Lite's default autosize.contains is 'content', which places padding
    // OUTSIDE the container-specified dimensions → SVG is 2×padding larger than
    // container on each axis. 'padding' fits padding inside. See #480.
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    };

    const patched = patchVegaLiteSpec(spec);

    expect((patched as any).autosize).toEqual({
        type: 'fit',
        contains: 'padding'
    });
});

it('should preserve user-specified autosize when injecting container sizing', () => {
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        autosize: { type: 'none' },
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    } as TopLevelSpec;

    const patched = patchVegaLiteSpec(spec);

    expect((patched as any).autosize).toEqual({ type: 'none' });
});

it('should not inject autosize when user has specified both width and height', () => {
    // When user specifies explicit dimensions, Deneb does not inject container sizing,
    // and therefore does not inject autosize either. The user is in full control.
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: 500,
        height: 300,
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    };

    const patched = patchVegaLiteSpec(spec, {
        containerDimensions: { width: 800, height: 600 }
    });

    expect((patched as any).autosize).toBeUndefined();
});

it('should inject autosize when only width is missing', () => {
    // When only one dimension is missing, container sizing is still being injected
    // (just for the missing axis), so autosize should still be injected.
    const spec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        height: 300,
        data: { name: 'table' },
        mark: 'bar',
        encoding: {}
    } as TopLevelSpec;

    const patched = patchVegaLiteSpec(spec);

    expect(patched.width).toBe('container');
    expect((patched as any).autosize).toEqual({
        type: 'fit',
        contains: 'padding'
    });
});
```

### Step 4: Run the tests and verify

- [ ] **Step 4.1: Run the vega-runtime tests**

Run:
```bash
npm run test -w @deneb-viz/vega-runtime -- patch-vega-lite
```

Expected output: all tests in `patch-vega-lite.test.ts` pass, including the 4 new autosize tests. The test file should report roughly 22 passing tests (18 original + 4 new autosize - 2 removed padding = 20, approximate).

If a test fails, read the error carefully. Common failure modes:
- **`autosize` is `undefined` in the patched spec** → the injection code in `patch-vega-lite.ts` was not updated correctly. Re-check Step 2.1.
- **`autosize` is `{ type: 'fit', contains: 'padding' }` but the test expects `{ type: 'none' }`** → the user-autosize preservation logic is wrong. Check the `normalized.autosize === undefined` condition.
- **TypeScript error about `autosize` not existing on `TopLevelSpec`** → the `(patches as any).autosize = ...` cast is missing.

### Step 5: Commit

- [ ] **Step 5.1: Stage the changes**

Run:
```bash
git add packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts
```

- [ ] **Step 5.2: Present commit message for user to action**

Commit message:
```
fix(vega-runtime): inject autosize contains:padding to fit container (#480)

Vega-Lite's default autosize.contains is 'content', which places padding
outside the container-specified dimensions — producing an SVG that is
container + 2*padding in both dimensions. This manifested as unwanted
scrollbars on specs that should fit exactly.

Inject autosize: { type: 'fit', contains: 'padding' } alongside the
existing container width/height injection so the total rendered size
(including padding) fits within the container. User-specified autosize
is always preserved.

Replaces the unstaged padding: 0 injection from the 2026-04-08 attempt,
which correctly set the padding but did not change the autosize
behaviour — the deeper cause of the overflow.

Ref #480.
```

**Do not run `git commit` yourself.** Tell the user the files are staged and the message is ready.

---

## Task 2: Add `overlayscrollbars` dependencies

Small, standalone task — just adds the library to `app-core`. Nothing to test here; the real verification is in Task 4.

**Files:**
- Modify: `packages/app-core/package.json`
- Modify: `package-lock.json` (via `npm install`)

### Step 1: Add dependencies to package.json

- [ ] **Step 1.1: Read `packages/app-core/package.json`**

Run:
```bash
cat packages/app-core/package.json
```

Note the `dependencies` section.

- [ ] **Step 1.2: Add the two new dependencies**

Edit `packages/app-core/package.json`. In the `dependencies` object, add the following two entries, keeping alphabetical order:

```json
"overlayscrollbars": "^2.10.1",
"overlayscrollbars-react": "^0.5.6",
```

Alphabetical position: after `"monaco-editor"` and before `"react-data-table-component"`.

The final relevant block should look like:
```json
"monaco-editor": "0.46.0",
"overlayscrollbars": "^2.10.1",
"overlayscrollbars-react": "^0.5.6",
"react-data-table-component": "^7.7.0",
```

### Step 2: Install and verify

- [ ] **Step 2.1: Run `npm install` from the repo root**

Run:
```bash
npm install
```

Expected: the lockfile updates, both packages are added to `node_modules`. No peer dependency warnings about React (both packages support React 16+; React 19 is compatible).

If the install fails with a peer dependency error, read the error and report back — the plan assumes 2.10.x is the latest stable. If a specific version is needed, pin it explicitly and update this step.

- [ ] **Step 2.2: Verify the packages are installed**

Run:
```bash
ls node_modules/overlayscrollbars/package.json node_modules/overlayscrollbars-react/package.json
```

Expected: both files exist.

### Step 3: Commit

- [ ] **Step 3.1: Stage the changes**

Run:
```bash
git add packages/app-core/package.json package-lock.json
```

- [ ] **Step 3.2: Present commit message for user to action**

Commit message:
```
chore(app-core): add overlayscrollbars and overlayscrollbars-react

Adds the JS-based overlay scrollbar library used by visual-viewer.tsx
and preview-area.tsx in subsequent commits to deliver true overlay
behaviour (zero gutter reservation) that is no longer achievable via
pure CSS in modern Chromium (overflow: overlay is deprecated).

Net bundle delta after the earlier removal of react-custom-scrollbars-2
is approximately +15 KB, well within the Power BI visual budget.

Ref #480.
```

---

## Task 3: Create `scrollbar-style-vars` shared helper

TDD: write the failing tests first, then implement. The helper is tiny but has edge cases worth locking down — particularly the `addAlpha` hex zero-padding bug that the current inline version in `visual-viewer.tsx` has.

**Files:**
- Create: `packages/app-core/src/lib/scrollbars/scrollbar-style-vars.ts`
- Create: `packages/app-core/src/lib/scrollbars/__tests__/scrollbar-style-vars.test.ts`

### Step 1: Write the failing tests

- [ ] **Step 1.1: Create the test file**

Create `packages/app-core/src/lib/scrollbars/__tests__/scrollbar-style-vars.test.ts` with this content:

```typescript
import { describe, expect, it } from 'vitest';
import {
    addAlpha,
    getScrollbarStyleVars
} from '../scrollbar-style-vars';

describe('addAlpha', () => {
    it('appends alpha hex pair for a mid-range opacity', () => {
        // 0.2 * 255 = 51 = 0x33
        expect(addAlpha('#000000', 0.2)).toBe('#00000033');
    });

    it('appends ff for full opacity', () => {
        expect(addAlpha('#ffffff', 1)).toBe('#ffffffff');
    });

    it('zero-pads single-digit hex alpha values', () => {
        // 0.02 * 255 ≈ 5 = 0x5 → must be '05', not '5'
        // The old inline version missed this, producing invalid 7-char hex strings.
        expect(addAlpha('#000000', 0.02)).toBe('#00000005');
    });

    it('zero-pads the boundary value just below single-digit-hex', () => {
        // 0.04 * 255 ≈ 10 = 0xa → must be '0a'
        expect(addAlpha('#000000', 0.04)).toBe('#0000000a');
    });

    it('clamps opacity above 1 to 1', () => {
        expect(addAlpha('#ff0000', 2)).toBe('#ff0000ff');
    });

    it('clamps negative opacity to 0 (fully transparent)', () => {
        // -1 is truthy, so `-1 || 1` stays as -1; Math.max(-1, 0) → 0.
        // Alpha 0x00 = fully transparent. Note the asymmetry with the next
        // test: negative values clamp to transparent, but opacity of exactly
        // 0 is treated as full opacity (the next test) due to the `|| 1`
        // falsy fallback. This asymmetry is preserved from the original
        // inline helper in visual-viewer.tsx.
        expect(addAlpha('#ff0000', -1)).toBe('#ff000000');
    });

    it('treats 0 opacity as full opacity due to || 1 fallback', () => {
        // Documents existing behaviour preserved from the inline addAlpha.
        // `0 || 1` → 1. Users relying on scrollbarOpacity = 0 as "fully
        // transparent" get full opacity instead. This matches the behaviour
        // of the original visual-viewer.tsx inline helper.
        expect(addAlpha('#ff0000', 0)).toBe('#ff0000ff');
    });

    it('accepts an uppercase hex colour and preserves case', () => {
        expect(addAlpha('#FF0000', 0.5)).toBe('#FF000080');
    });
});

describe('getScrollbarStyleVars', () => {
    it('returns all three CSS variables as a style object', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 0, 8);
        expect(vars).toHaveProperty('--os-size');
        expect(vars).toHaveProperty('--os-handle-bg');
        expect(vars).toHaveProperty('--os-handle-border-radius');
    });

    it('emits scrollbarWidth as an os-size pixel value', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 0, 12);
        expect(vars['--os-size' as keyof typeof vars]).toBe('12px');
    });

    it('emits scrollbarRadius as an os-handle-border-radius pixel value', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 3, 8);
        expect(vars['--os-handle-border-radius' as keyof typeof vars]).toBe(
            '3px'
        );
    });

    it('applies opacity to colour via addAlpha', () => {
        // 20 / 100 = 0.2 → 0x33
        const vars = getScrollbarStyleVars('#000000', 20, 0, 8);
        expect(vars['--os-handle-bg' as keyof typeof vars]).toBe('#00000033');
    });

    it('divides the 0-100 percentage opacity by 100 before converting', () => {
        // 50 / 100 = 0.5 → 0x80
        const vars = getScrollbarStyleVars('#ffffff', 50, 0, 8);
        expect(vars['--os-handle-bg' as keyof typeof vars]).toBe('#ffffff80');
    });

    it('handles the full range of scrollbarWidth (4-16 px)', () => {
        const narrow = getScrollbarStyleVars('#000000', 20, 0, 4);
        const wide = getScrollbarStyleVars('#000000', 20, 0, 16);
        expect(narrow['--os-size' as keyof typeof narrow]).toBe('4px');
        expect(wide['--os-size' as keyof typeof wide]).toBe('16px');
    });
});
```

- [ ] **Step 1.2: Run the tests — verify they fail**

Run:
```bash
npm run test -w @deneb-viz/app-core -- scrollbar-style-vars
```

Expected: all tests fail with `Cannot find module '../scrollbar-style-vars'` or equivalent — the module does not yet exist.

### Step 2: Implement the module

- [ ] **Step 2.1: Create `scrollbar-style-vars.ts`**

Create `packages/app-core/src/lib/scrollbars/scrollbar-style-vars.ts` with this content:

```typescript
import type { CSSProperties } from 'react';

/**
 * Convert a 6-digit hex colour into an 8-digit hex with alpha, given 0–1 opacity.
 *
 * Defensive: clamps opacity to [0, 1]. Zero-pads single-digit hex alpha values
 * (e.g. opacity 0.02 → '05', not '5') so the result is always a valid 9-char
 * hex colour string.
 *
 * Note: due to the `|| 1` fallback, an opacity of `0` is treated as full opacity.
 * This matches the existing behaviour of the inline helper previously in
 * visual-viewer.tsx and is preserved intentionally to avoid silent user-visible
 * behaviour changes on existing deployments.
 *
 * @example
 *   addAlpha('#000000', 0.2) // '#00000033'
 *   addAlpha('#ffffff', 1)   // '#ffffffff'
 *   addAlpha('#000000', 0.02) // '#00000005' (not '#0000005')
 */
export const addAlpha = (color: string, opacity: number): string => {
    const _opacity = Math.round(
        Math.min(Math.max(opacity || 1, 0), 1) * 255
    );
    return `${color}${_opacity.toString(16).padStart(2, '0')}`;
};

/**
 * Build the inline-style CSS custom properties object consumed by
 * `overlayscrollbars` on the host element. Maps Deneb's four user-configurable
 * display settings to the library's three styling variables:
 *
 *   scrollbarWidth       → --os-size
 *   scrollbarColor +     → --os-handle-bg (via addAlpha)
 *     scrollbarOpacity
 *   scrollbarRadius      → --os-handle-border-radius
 *
 * @param scrollbarColor 6-digit hex colour (e.g. '#000000')
 * @param scrollbarOpacity 0-100 percentage
 * @param scrollbarRadius pixel radius (0-3)
 * @param scrollbarWidth pixel width (4-16)
 * @returns Inline style object suitable for `style={...}` on an element
 */
export const getScrollbarStyleVars = (
    scrollbarColor: string,
    scrollbarOpacity: number,
    scrollbarRadius: number,
    scrollbarWidth: number
): CSSProperties =>
    ({
        '--os-size': `${scrollbarWidth}px`,
        '--os-handle-bg': addAlpha(scrollbarColor, scrollbarOpacity / 100),
        '--os-handle-border-radius': `${scrollbarRadius}px`
    }) as CSSProperties;
```

### Step 3: Run the tests — verify they pass

- [ ] **Step 3.1: Run the app-core tests**

Run:
```bash
npm run test -w @deneb-viz/app-core -- scrollbar-style-vars
```

Expected: all 14 tests pass (8 `addAlpha` + 6 `getScrollbarStyleVars`).

If the `'zero-pads single-digit hex alpha values'` test fails with a result of `'#0000005'`, the `.padStart(2, '0')` is missing from the `toString(16)` call. Add it.

### Step 4: Commit

- [ ] **Step 4.1: Stage the changes**

Run:
```bash
git add packages/app-core/src/lib/scrollbars/scrollbar-style-vars.ts packages/app-core/src/lib/scrollbars/__tests__/scrollbar-style-vars.test.ts
```

- [ ] **Step 4.2: Present commit message for user to action**

Commit message:
```
feat(app-core): add scrollbar-style-vars shared helper

Adds a pure-function helper that maps Deneb's four user-configurable
display settings (scrollbarColor, scrollbarOpacity, scrollbarRadius,
scrollbarWidth) to the three CSS custom properties consumed by
overlayscrollbars (--os-size, --os-handle-bg, --os-handle-border-radius).

Includes addAlpha, relocated from visual-viewer.tsx, with a fix:
the inline version was missing .padStart(2, '0') on the hex conversion,
producing invalid 7-char hex strings for opacity values below ~6%.
Users relying on low-opacity scrollbars silently got broken colours;
they now get valid ones.

Used by visual-viewer.tsx and preview-area.tsx in subsequent commits.

Ref #480.
```

---

## Task 4: Replace visual-viewer scroll container with `OverlayScrollbarsComponent`

This is the largest task. Replaces the native `<div>` + Griffel + webkit pseudo-element approach with the library. Scroll event wiring and container ID routing move to post-mount effects.

**Files:**
- Modify: `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx`

### Step 1: Read the current state of visual-viewer.tsx

- [ ] **Step 1.1: Open and read the file**

Run:
```bash
cat packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx
```

Key areas to locate:
- Imports block at the top (around lines 1-20)
- `useVisualViewerStyles` and `useScrollContainerStyles` Griffel blocks (around lines 39-74)
- The `VisualViewer` component body (starts around line 96)
- The state destructuring including `scrollbarColor`, `scrollbarOpacity`, `scrollbarRadius`, `scrollbarWidth`, `scrollEventThrottle` (around lines 100-156)
- `useScrollbars` memo (around line 351)
- The `containerRef`, `scrollPosition`, `throttledScrollPosition` hooks (around lines 356-363)
- The native scroll listener `useEffect` (around lines 469-483)
- The `denebContainer` signal-update `useEffect` (around lines 485-502)
- The `return` block (around lines 507-529)
- The inline `addAlpha` helper at the bottom (around lines 536-539)

### Step 2: Update the imports

- [ ] **Step 2.1: Replace the top-of-file imports**

At the top of `visual-viewer.tsx`, the current imports include:
```typescript
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
```

Keep these but add the overlayscrollbars imports and the shared helper import. The new import block at the top of the file should be:

```typescript
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import {
    OverlayScrollbarsComponent,
    type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';

import { DEFAULT_VIEWPORT_SCALE } from '@deneb-viz/configuration';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import type { SchemaValidator } from '@deneb-viz/vega-runtime/spec-processing';
import type { Renderers } from 'vega';
import { getSignalDenebContainer } from '@deneb-viz/vega-runtime/signals';
import { logRender, logDebug } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { VegaEmbed } from './vega-embed';
import { VegaEmbedErrorBoundary } from './vega-embed-error-boundary';
import { VEGA_CONTAINER_ID } from '../constants';
import { performIncrementalUpdate } from '../incremental-update';
import { useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../deneb-platform';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega/incremental-update-configuration';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { getScrollbarStyleVars } from '../../../lib/scrollbars/scrollbar-style-vars';
```

The additions:
- `OverlayScrollbarsComponent`, `type OverlayScrollbarsComponentRef` from `overlayscrollbars-react`
- Side-effect CSS import `'overlayscrollbars/overlayscrollbars.css'`
- `getScrollbarStyleVars` from the shared helper

### Step 3: Delete the `useScrollContainerStyles` Griffel block

- [ ] **Step 3.1: Remove the entire `useScrollContainerStyles` definition**

Find and delete this block (the current unstaged content):

```typescript
const useScrollContainerStyles = makeStyles({
    overlay: {
        overflow: 'overlay' as 'auto', // Chromium: overlay scrollbars without gutter reservation; fallback: auto
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--deneb-sb-thumb, #00000033) transparent',
        '::-webkit-scrollbar': {
            width: 'var(--deneb-sb-width, 8px)',
            height: 'var(--deneb-sb-width, 8px)',
            background: 'transparent'
        },
        '::-webkit-scrollbar-thumb': {
            background: 'var(--deneb-sb-thumb, #00000033)',
            borderRadius: 'var(--deneb-sb-radius, 0px)'
        },
        '::-webkit-scrollbar-thumb:hover': {
            background: 'var(--deneb-sb-thumb, #00000033)'
        },
        '::-webkit-scrollbar-track': {
            background: 'transparent'
        },
        '::-webkit-scrollbar-corner': {
            background: 'transparent'
        }
    }
});
```

The `useVisualViewerStyles` block above it stays untouched.

### Step 4: Update the scroll container ref and replace the native scroll listener

- [ ] **Step 4.1: Replace `containerRef` with `osRef` and update the scroll listener effect**

Find this block in the component body:
```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [scrollPosition, setScrollPosition] = useState<ScrollPosition | null>(
    null
);
const throttledScrollPosition = useThrottle(
    scrollPosition,
    scrollEventThrottle
);
```

Replace it with:
```typescript
const osRef = useRef<OverlayScrollbarsComponentRef>(null);
const [scrollPosition, setScrollPosition] = useState<ScrollPosition | null>(
    null
);
const throttledScrollPosition = useThrottle(
    scrollPosition,
    scrollEventThrottle
);
```

- [ ] **Step 4.2: Replace the native scroll listener useEffect**

Find this block:
```typescript
useEffect(() => {
    if (!useScrollbars) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
        setScrollPosition({
            scrollTop: el.scrollTop,
            scrollLeft: el.scrollLeft
        });
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
    // containerRef.current is stable; setScrollPosition is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [useScrollbars]);
```

Replace it with:
```typescript
// Wire native scroll events from the overlayscrollbars viewport element
// into our throttled scrollPosition state, which drives the denebContainer
// signal below. The library exposes the real scrollable element via
// instance.elements().viewport — that's where scrollTop/scrollLeft live.
useEffect(() => {
    if (!useScrollbars) return;
    const instance = osRef.current?.osInstance();
    if (!instance) return;
    const viewport = instance.elements().viewport;
    const handler = () => {
        setScrollPosition({
            scrollTop: viewport.scrollTop,
            scrollLeft: viewport.scrollLeft
        });
    };
    viewport.addEventListener('scroll', handler, { passive: true });
    return () => viewport.removeEventListener('scroll', handler);
    // osRef is stable; setScrollPosition is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [useScrollbars]);

// Route VEGA_CONTAINER_ID onto the overlayscrollbars viewport element so
// outside consumers (debugging, tests, any CSS targeting the ID) continue
// to find the scrollable container. Library wraps the content in its own
// divs, so the ID must be assigned post-mount via ref.
useEffect(() => {
    if (!useScrollbars) return;
    const viewport = osRef.current?.osInstance()?.elements().viewport;
    if (!viewport) return;
    viewport.id = VEGA_CONTAINER_ID;
    return () => {
        viewport.removeAttribute('id');
    };
}, [useScrollbars]);
```

### Step 5: Update the `denebContainer` signal-update effect

- [ ] **Step 5.1: Update the viewport-element read to use the library's viewport**

Find this block:
```typescript
useEffect(() => {
    // Don't update scroll signal if view isn't ready or scroll position not set
    if (!throttledScrollPosition || !viewReady) return;
    const view = VegaViewServices.getView();
    if (!view) return;
    const el = containerRef.current;
    const signal = getSignalDenebContainer({
        scroll: {
            height: el?.clientHeight ?? 0,
            width: el?.clientWidth ?? 0,
            scrollHeight: el?.scrollHeight ?? 0,
            scrollWidth: el?.scrollWidth ?? 0,
            scrollTop: throttledScrollPosition.scrollTop,
            scrollLeft: throttledScrollPosition.scrollLeft
        }
    });
    VegaViewServices.setSignalByName(signal.name, signal.value);
}, [throttledScrollPosition, viewReady]);
```

Replace it with:
```typescript
useEffect(() => {
    // Don't update scroll signal if view isn't ready or scroll position not set
    if (!throttledScrollPosition || !viewReady) return;
    const view = VegaViewServices.getView();
    if (!view) return;
    const viewport = osRef.current?.osInstance()?.elements().viewport;
    const signal = getSignalDenebContainer({
        scroll: {
            height: viewport?.clientHeight ?? 0,
            width: viewport?.clientWidth ?? 0,
            scrollHeight: viewport?.scrollHeight ?? 0,
            scrollWidth: viewport?.scrollWidth ?? 0,
            scrollTop: throttledScrollPosition.scrollTop,
            scrollLeft: throttledScrollPosition.scrollLeft
        }
    });
    VegaViewServices.setSignalByName(signal.name, signal.value);
}, [throttledScrollPosition, viewReady]);
```

Only change: `const el = containerRef.current;` → `const viewport = osRef.current?.osInstance()?.elements().viewport;`, and all subsequent `el?.*` references become `viewport?.*`.

### Step 6: Replace the `return` block

- [ ] **Step 6.1: Remove the scroll container classes var + resolvedThumbColor var at the top of the return block**

Find this block (immediately before the `return`):
```typescript
const scrollContainerClasses = useScrollContainerStyles();
const resolvedThumbColor = addAlpha(scrollbarColor, scrollbarOpacity / 100);
```

Replace with:
```typescript
const scrollbarStyleVars = getScrollbarStyleVars(
    scrollbarColor,
    scrollbarOpacity,
    scrollbarRadius,
    scrollbarWidth
);
```

(`useScrollContainerStyles` no longer exists. `resolvedThumbColor` and inline CSS vars are replaced by the `getScrollbarStyleVars` call.)

- [ ] **Step 6.2: Replace the entire `return (...)` block**

Find this block:
```typescript
return (
    <div
        ref={containerRef}
        id={useScrollbars ? VEGA_CONTAINER_ID : undefined}
        className={mergeClasses(
            classes.container,
            useScrollbars
                ? scrollContainerClasses.overlay
                : classes.overflowVisible
        )}
        style={
            useScrollbars
                ? ({
                      '--deneb-sb-thumb': resolvedThumbColor,
                      '--deneb-sb-width': `${scrollbarWidth}px`,
                      '--deneb-sb-radius': `${scrollbarRadius}px`
                  } as React.CSSProperties)
                : undefined
        }
    >
        {vegaComponent}
    </div>
);
```

Replace it with:
```typescript
return useScrollbars ? (
    <OverlayScrollbarsComponent
        ref={osRef}
        className={classes.container}
        style={scrollbarStyleVars}
        options={{
            scrollbars: {
                autoHide: 'never',
                visibility: 'auto'
            },
            overflow: { x: 'scroll', y: 'scroll' }
        }}
        defer
    >
        {vegaComponent}
    </OverlayScrollbarsComponent>
) : (
    <div
        className={mergeClasses(
            classes.container,
            classes.overflowVisible
        )}
    >
        {vegaComponent}
    </div>
);
```

Notes:
- The `useScrollbars ? ... : ...` ternary keeps the editor preview branch (where `isEmbeddedInEditor && !previewScrollbars`) rendering a plain `<div>` with `overflowVisible`, unchanged.
- `className={classes.container}` on the `OverlayScrollbarsComponent` — verify in the library docs that the className is applied to the host element (it is, per overlayscrollbars-react v0.5.x API).
- `VEGA_CONTAINER_ID` is **not** applied as an `id` prop on the component itself — it's routed to the viewport element via the post-mount effect in Step 4.2 instead.

### Step 7: Delete the inline `addAlpha` helper

- [ ] **Step 7.1: Remove the `addAlpha` function at the bottom of the file**

Find and delete this block at the bottom of `visual-viewer.tsx`:

```typescript
/**
 * For a hex value, add the corresponding opacity value to the end, adjusted
 * based on the value.
 */
const addAlpha = (color: string, opacity: number) => {
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    return `${color}${_opacity.toString(16)}`;
};
```

`addAlpha` now lives in the shared module and is not imported into `visual-viewer.tsx` directly — it's called inside `getScrollbarStyleVars`, which is what `visual-viewer.tsx` imports.

### Step 8: Verify build and tests

- [ ] **Step 8.1: Typecheck the app-core package**

Run:
```bash
npm run typecheck -w @deneb-viz/app-core 2>&1 | tail -30
```

Expected: no errors. Common failures at this point:
- **Unused import `makeStyles`** — if the only consumer of `makeStyles` in the file was `useScrollContainerStyles`, which is now deleted, but `useVisualViewerStyles` also uses `makeStyles`, so the import should still be needed. If an "unused import" error appears, verify `useVisualViewerStyles` still exists.
- **`React.CSSProperties` not imported** — verify the JSX `style={scrollbarStyleVars}` compiles; `scrollbarStyleVars` is already typed as `CSSProperties` by the helper.
- **Unused import `mergeClasses`** — if `mergeClasses` is no longer used after the return replacement. Check whether the non-scrollbars branch still uses it (it does: `mergeClasses(classes.container, classes.overflowVisible)`). Keep the import.

- [ ] **Step 8.2: Run the app-core tests**

Run:
```bash
npm run test -w @deneb-viz/app-core 2>&1 | tail -20
```

Expected: all existing tests pass, plus the new `scrollbar-style-vars` tests from Task 3. No visual-viewer unit tests exist in this codebase (verified during plan writing — app-core uses `.test.ts` only, no `.test.tsx` component tests).

### Step 9: Commit

- [ ] **Step 9.1: Stage the changes**

Run:
```bash
git add packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx
```

- [ ] **Step 9.2: Present commit message for user to action**

Commit message:
```
feat(app-core): replace native scroll container with overlayscrollbars (#480)

Swaps the unstyled browser-default overflow container in visual-viewer.tsx
for <OverlayScrollbarsComponent> from overlayscrollbars-react. Gains:

- True overlay scrollbars with zero gutter reservation in modern Chromium
  (overflow: overlay has been deprecated/aliased to overflow: auto since
  Chromium 102, leaving no pure-CSS path to overlay behaviour)
- User-configurable scrollbarColor/Opacity/Width/Radius settings now
  actually take effect (the previous webkit pseudo-element rules were
  being silently ignored because scrollbar-width: thin puts Chromium
  onto its standard-CSS scrollbar path)

Scroll events are wired from instance.elements().viewport into the
existing throttled scrollPosition state, preserving the denebContainer
signal contract unchanged.

VEGA_CONTAINER_ID is assigned to the viewport element post-mount via a
ref-driven effect, keeping outside consumers able to find the scrollable
container.

The inline addAlpha helper has been removed — its replacement (with a
hex zero-padding bugfix) lives in lib/scrollbars/scrollbar-style-vars.ts
and is used via getScrollbarStyleVars.

Ref #480.
```

---

## Task 5: Replace preview-area scroll container with `OverlayScrollbarsComponent`

Mirrors Task 4 but for the editor preview-area outer scroll container. The outer preview-area scrolls when editor zoom or viewport size exceeds the visible editor space. No scroll-event wiring needed (the outer container doesn't feed any signal — only the inner VisualViewer does).

**Files:**
- Modify: `packages/app-core/src/features/preview-area/components/preview-area.tsx`

### Step 1: Update imports

- [ ] **Step 1.1: Replace the top-of-file imports**

At the top of `preview-area.tsx`, the current imports include:
```typescript
import { type CSSProperties, useMemo } from 'react';
import {
    makeStyles,
    shorthands,
    tokens,
    mergeClasses
} from '@fluentui/react-components';
import { VegaViewProvider } from '@deneb-viz/vega-react';
```

Add:
```typescript
import { type CSSProperties, useMemo } from 'react';
import {
    makeStyles,
    shorthands,
    tokens,
    mergeClasses
} from '@fluentui/react-components';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';
import { VegaViewProvider } from '@deneb-viz/vega-react';
```

And further down (just after the `useDenebState` or adjacent existing import), add:
```typescript
import { getScrollbarStyleVars } from '../../../lib/scrollbars/scrollbar-style-vars';
```

### Step 2: Remove `shorthands.overflow('overlay')` from the Griffel block

- [ ] **Step 2.1: Edit `usePreviewStyles.previewArea`**

Find:
```typescript
previewArea: {
    ...shorthands.padding('2px'),
    ...shorthands.overflow('overlay'),
    boxSizing: 'border-box',
    width: '100%',
    height: '100%'
},
```

Replace with:
```typescript
previewArea: {
    ...shorthands.padding('2px'),
    boxSizing: 'border-box',
    width: '100%',
    height: '100%'
},
```

The `overflow: overlay` line is gone; the overlayscrollbars library manages overflow on the element itself.

### Step 3: Subscribe to scrollbar settings from state

- [ ] **Step 3.1: Add the four scrollbar settings to the `useDenebState` selector**

Find:
```typescript
const {
    editorPreviewAreaHeight,
    editorZoomLevel,
    provider,
    status,
    viewportHeight,
    viewportWidth,
    showViewportMarker
} = useDenebState((state) => ({
    editorPreviewAreaHeight: state.editor.previewAreaViewport.height ?? 0,
    editorZoomLevel: state.editorZoomLevel,
    provider: state.project.provider as SpecProvider,
    showViewportMarker: state.editorPreferences.previewAreaShowBorder,
    status: state.compilation.result?.status ?? COMPILATION_STATUS_DEFAULT,
    viewportHeight: state.interface.embedViewport?.height ?? 0,
    viewportWidth: state.interface.embedViewport?.width ?? 0
}));
```

Replace with:
```typescript
const {
    editorPreviewAreaHeight,
    editorZoomLevel,
    provider,
    status,
    viewportHeight,
    viewportWidth,
    showViewportMarker,
    scrollbarColor,
    scrollbarOpacity,
    scrollbarRadius,
    scrollbarWidth
} = useDenebState((state) => ({
    editorPreviewAreaHeight: state.editor.previewAreaViewport.height ?? 0,
    editorZoomLevel: state.editorZoomLevel,
    provider: state.project.provider as SpecProvider,
    showViewportMarker: state.editorPreferences.previewAreaShowBorder,
    status: state.compilation.result?.status ?? COMPILATION_STATUS_DEFAULT,
    viewportHeight: state.interface.embedViewport?.height ?? 0,
    viewportWidth: state.interface.embedViewport?.width ?? 0,
    scrollbarColor: state.visualRender.scrollbarColor,
    scrollbarOpacity: state.visualRender.scrollbarOpacity,
    scrollbarRadius: state.visualRender.scrollbarRadius,
    scrollbarWidth: state.visualRender.scrollbarWidth
}));
```

### Step 4: Build the scrollbar style vars and merge them with the existing styleVars

- [ ] **Step 4.1: Compute the merged style object**

Find this block (after the `useDenebState` call and `classes` declaration):
```typescript
const classes = usePreviewStyles();
const borderWidth = DEBUG_PANE_CONFIGURATION.viewportBorderSize;
const scale = editorZoomLevel / 100;
const styleVars: CSSProperties = {
    ['--vp-height' as unknown as keyof CSSProperties]: `${viewportHeight}px`,
    ['--vp-width' as unknown as keyof CSSProperties]: `${viewportWidth}px`,
    ['--vp-border' as unknown as keyof CSSProperties]: `${borderWidth}px`,
    ['--vp-scale' as unknown as keyof CSSProperties]: String(scale)
};
logRender('VisualPreview', status, editorPreviewAreaHeight);
```

Replace with:
```typescript
const classes = usePreviewStyles();
const borderWidth = DEBUG_PANE_CONFIGURATION.viewportBorderSize;
const scale = editorZoomLevel / 100;
const styleVars: CSSProperties = {
    ['--vp-height' as unknown as keyof CSSProperties]: `${viewportHeight}px`,
    ['--vp-width' as unknown as keyof CSSProperties]: `${viewportWidth}px`,
    ['--vp-border' as unknown as keyof CSSProperties]: `${borderWidth}px`,
    ['--vp-scale' as unknown as keyof CSSProperties]: String(scale)
};
const scrollbarStyleVars = getScrollbarStyleVars(
    scrollbarColor,
    scrollbarOpacity,
    scrollbarRadius,
    scrollbarWidth
);
const combinedStyleVars: CSSProperties = {
    ...styleVars,
    ...scrollbarStyleVars
};
logRender('VisualPreview', status, editorPreviewAreaHeight);
```

### Step 5: Wrap the preview area with `OverlayScrollbarsComponent`

- [ ] **Step 5.1: Replace the `return` block**

Find:
```typescript
return (
    <VegaViewProvider>
        <div className={classes.previewArea} style={styleVars}>
            <div
                className={mergeClasses(
                    classes.previewWrapper,
                    showViewportMarker
                        ? classes.previewWrapperViewportMarker
                        : classes.previewWrapperNoMarker
                )}
            >
                <div
                    id='deneb-visual-preview'
                    className={classes.previewContainer}
                >
                    <VisualViewer
                        isEmbeddedInEditor
                        schemaValidator={schemaValidator}
                    />
                </div>
            </div>
        </div>
    </VegaViewProvider>
);
```

Replace with:
```typescript
return (
    <VegaViewProvider>
        <OverlayScrollbarsComponent
            className={classes.previewArea}
            style={combinedStyleVars}
            options={{
                scrollbars: {
                    autoHide: 'never',
                    visibility: 'auto'
                },
                overflow: { x: 'scroll', y: 'scroll' }
            }}
            defer
        >
            <div
                className={mergeClasses(
                    classes.previewWrapper,
                    showViewportMarker
                        ? classes.previewWrapperViewportMarker
                        : classes.previewWrapperNoMarker
                )}
            >
                <div
                    id='deneb-visual-preview'
                    className={classes.previewContainer}
                >
                    <VisualViewer
                        isEmbeddedInEditor
                        schemaValidator={schemaValidator}
                    />
                </div>
            </div>
        </OverlayScrollbarsComponent>
    </VegaViewProvider>
);
```

Changes:
- Outer `<div className={classes.previewArea} style={styleVars}>` becomes `<OverlayScrollbarsComponent className={classes.previewArea} style={combinedStyleVars} options={...} defer>`
- Same inner children, preserving the existing `previewWrapper` → `previewContainer` → `<VisualViewer>` structure
- No ref needed (no scroll-event wiring — this outer scroll doesn't feed any signal)

### Step 6: Verify build and tests

- [ ] **Step 6.1: Typecheck**

Run:
```bash
npm run typecheck -w @deneb-viz/app-core 2>&1 | tail -30
```

Expected: no errors. If you see "property 'visualRender' does not exist on type ..." this means the state slice path is wrong. Check that `scrollbarColor` and siblings are accessed via `state.visualRender.scrollbarColor` (same as in `visual-viewer.tsx`).

- [ ] **Step 6.2: Run tests**

Run:
```bash
npm run test -w @deneb-viz/app-core 2>&1 | tail -20
```

Expected: all tests pass.

### Step 7: Commit

- [ ] **Step 7.1: Stage the changes**

Run:
```bash
git add packages/app-core/src/features/preview-area/components/preview-area.tsx
```

- [ ] **Step 7.2: Present commit message for user to action**

Commit message:
```
feat(app-core): apply overlayscrollbars to editor preview area (#480)

Replaces the previewArea outer scroll container's deprecated
shorthands.overflow('overlay') with <OverlayScrollbarsComponent>,
subscribing to the same user scrollbar settings as visual-viewer.tsx
via the shared getScrollbarStyleVars helper.

With this, when an author zooms the editor or sets a viewport larger
than the editor space, the outer scroll container renders true overlay
scrollbars that match whatever styling the author has configured for
the production visual. The editor preview now looks the same as what
end users will see in the deployed visual.

No scroll-event wiring is added — only the inner VisualViewer feeds
the denebContainer signal; the outer preview-area scroll is purely
visual.

Ref #480.
```

---

## Task 6: Delete the obsolete `overlay-styles.ts` factory

After Tasks 4 and 5, nothing references `getOverlayScrollbarStyles`. Clean it up.

**Files:**
- Delete: `packages/app-core/src/lib/scrollbars/overlay-styles.ts`
- Delete: `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts`
- Modify: `packages/app-core/src/lib/scrollbars/index.ts`

### Step 1: Verify nothing still imports `getOverlayScrollbarStyles`

- [ ] **Step 1.1: Grep for remaining usages**

Run:
```bash
grep -rn "getOverlayScrollbarStyles\|OverlayScrollbarOptions" packages/app-core/src/ --include="*.ts" --include="*.tsx"
```

Expected output (these are the only files we're about to delete/modify):
```
packages/app-core/src/lib/scrollbars/overlay-styles.ts:...
packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts:...
packages/app-core/src/lib/scrollbars/index.ts:export { getOverlayScrollbarStyles } from './overlay-styles';
packages/app-core/src/lib/scrollbars/index.ts:export type { OverlayScrollbarOptions } from './overlay-styles';
```

If any OTHER file appears, STOP — that file is still using the factory. Either migrate it (using `getScrollbarStyleVars` if it's a scroll container, or another approach if it's something else) or roll back this deletion task. Do not delete the factory while it has consumers.

### Step 2: Delete the factory and its tests

- [ ] **Step 2.1: Delete `overlay-styles.ts`**

Run:
```bash
rm packages/app-core/src/lib/scrollbars/overlay-styles.ts
```

- [ ] **Step 2.2: Delete `overlay-styles.test.ts`**

Run:
```bash
rm packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts
```

### Step 3: Update the scrollbars index file

- [ ] **Step 3.1: Rewrite `index.ts`**

Open `packages/app-core/src/lib/scrollbars/index.ts`.

Current content:
```typescript
export { getOverlayScrollbarStyles } from './overlay-styles';
export type { OverlayScrollbarOptions } from './overlay-styles';
```

Replace with:
```typescript
export {
    addAlpha,
    getScrollbarStyleVars
} from './scrollbar-style-vars';
```

### Step 4: Verify build and tests

- [ ] **Step 4.1: Typecheck**

Run:
```bash
npm run typecheck -w @deneb-viz/app-core 2>&1 | tail -30
```

Expected: no errors. If a "Cannot find module './overlay-styles'" error appears, something still references the deleted file — check Step 1 again.

- [ ] **Step 4.2: Run tests**

Run:
```bash
npm run test -w @deneb-viz/app-core 2>&1 | tail -20
```

Expected: all tests pass. The 9 tests in the deleted `overlay-styles.test.ts` are gone; the 14 tests in `scrollbar-style-vars.test.ts` remain.

### Step 5: Commit

- [ ] **Step 5.1: Stage the changes**

Run:
```bash
git add packages/app-core/src/lib/scrollbars/index.ts
git add -u packages/app-core/src/lib/scrollbars/overlay-styles.ts packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts
```

(The `git add -u` on the deleted files stages their removal.)

- [ ] **Step 5.2: Verify staging**

Run:
```bash
git status --short packages/app-core/src/lib/scrollbars/
```

Expected:
```
M  packages/app-core/src/lib/scrollbars/index.ts
D  packages/app-core/src/lib/scrollbars/overlay-styles.ts
D  packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts
```

- [ ] **Step 5.3: Present commit message for user to action**

Commit message:
```
chore(app-core): remove obsolete getOverlayScrollbarStyles factory

The factory was created in the 2026-04-08 overlay-scrollbars attempt
as a shared helper for visual-viewer.tsx, data-table.tsx and
log-viewer.tsx. In practice data-table and log-viewer never needed
it (they use native scrollbars which already look correct), and
visual-viewer has now moved to overlayscrollbars.

Replaced in scrollbars/index.ts by the exports from the new
scrollbar-style-vars helper module.

Ref #480.
```

---

## Task 7: Manual regression verification

Walk through the regression checklist from the spec. No code changes expected — this is the safety net that catches any unintended impact from Tasks 4–6. If an issue is found, fix it inline (a small follow-up commit) and re-run.

**Files:** none (verification only, unless a fix is needed)

### Step 1: Start the dev server

- [ ] **Step 1.1: Run `npm run dev`**

Run:
```bash
npm run dev
```

Wait for all watchers to start and for webpack to reach "compiled successfully" on https://localhost:8080.

- [ ] **Step 1.2: Open Power BI Desktop pointing at the dev visual**

Load a report with the Deneb visual configured in developer mode. Open any Deneb visual on a report page.

### Step 2: Layer 1 verification (the 10px fix)

- [ ] **Step 2.1: Fitted bar chart test**

Use a simple Vega-Lite bar chart spec with no explicit `width`, `height`, `padding`, or `autosize`. Example:
```json
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "mark": "bar",
    "encoding": {
        "x": { "field": "category", "type": "nominal" },
        "y": { "field": "value", "type": "quantitative" }
    }
}
```

Open Chrome DevTools, inspect the `<svg class="marks">` element.

**Expected:**
- SVG `width` attribute equals the `#deneb-vega-container` element's `clientWidth`
- SVG `height` attribute equals the `#deneb-vega-container` element's `clientHeight`
- Zero scrollbars visible in the Power BI visual

**If fail:** the Layer 1 fix didn't land. Check that the autosize injection is in place in `patch-vega-lite.ts` and the webpack dev server actually picked up the change (restart if needed).

- [ ] **Step 2.2: Oversized spec test**

Replace the spec with one that explicitly sets large dimensions:
```json
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "width": 800,
    "height": 600,
    "mark": "bar",
    "encoding": {
        "x": { "field": "category", "type": "nominal" },
        "y": { "field": "value", "type": "quantitative" }
    }
}
```

Resize the Power BI visual smaller than 800×600.

**Expected:**
- Overlay scrollbars appear on the right and bottom edges
- Scrollbars do NOT reserve gutter space (content extends to all four edges behind the scrollbar thumbs)
- Scrolling works via wheel, touch, and drag-thumb

### Step 3: Layer 2 verification (user settings take effect)

- [ ] **Step 3.1: Scrollbar colour test**

Keep the oversized spec from Step 2.2. In the Power BI format pane under the Deneb visual's "Display" section, change `scrollbarColor` to a distinct colour like `#ff0000`.

**Expected:** scrollbar thumbs become red (with the current opacity level applied via alpha).

- [ ] **Step 3.2: Scrollbar width test**

Change `scrollbarWidth` from the default (8) to 16.

**Expected:** scrollbar tracks visibly become wider (roughly 2x).

- [ ] **Step 3.3: Scrollbar radius test**

Change `scrollbarRadius` from the default (0) to 3.

**Expected:** scrollbar thumb corners become rounded.

- [ ] **Step 3.4: Scrollbar opacity test**

Change `scrollbarOpacity` from the default (20) to 100.

**Expected:** scrollbar thumbs become fully opaque.

Change to 50.

**Expected:** scrollbar thumbs become half-transparent.

### Step 4: Editor (preview-area) verification

- [ ] **Step 4.1: Enter edit mode**

Enter the Deneb advanced editor on the visual.

- [ ] **Step 4.2: Zoom the editor preview**

Using the editor zoom controls, zoom the preview area beyond 100% (e.g., 200%).

**Expected:**
- The preview-area outer container shows scrollbars that overlay, don't reserve gutter
- The scrollbars are styled per the user's configured settings (same colour/width/radius as the production visual)

- [ ] **Step 4.3: Enable "Show scrollbars on overflow" in editor preferences**

In the editor preferences, enable `previewAreaShowScrollbarsOnOverflow`. Use an oversized spec (like the 800×600 from Step 2.2).

**Expected:**
- BOTH the outer preview-area scrollbar AND the inner visual-viewer scrollbar appear
- Both are styled identically (same colour, width, radius)
- Both are overlay (no gutter reservation)

### Step 5: Regression checks (the parts that must NOT change)

- [ ] **Step 5.1: Settings pane scrolling**

Scroll the Deneb settings pane in the editor (the right-hand accordion). Compare visually against the same action on a pre-Task-4 commit (if available) or against your memory of prior behaviour.

**Expected:** scrollbars look identical to the pre-overlay-scrollbars-v2 state. Native/Fluent scrollbars, no overlay library styling leaking in.

- [ ] **Step 5.2: Log viewer scrolling**

Open the debug pane (log viewer tab) and generate enough log entries to trigger scrolling. Scroll through them.

**Expected:** scrollbars look identical to the pre-change state.

- [ ] **Step 5.3: Data table scrolling**

Open the debug pane (data table tab). If the dataset is large enough to trigger horizontal or vertical scrolling in the table, scroll through it.

**Expected:** scrollbars look identical to the pre-change state.

- [ ] **Step 5.4: Monaco editor scrolling**

In the spec editor (Monaco), paste a long spec so the editor has scrollable content. Scroll vertically and horizontally.

**Expected:** Monaco's own scrollbar implementation is unchanged.

- [ ] **Step 5.5: DevTools leakage check**

Open DevTools. Inspect the settings pane, log viewer, data table, and a Monaco editor scrollbar. Look at the Elements → Styles panel for each.

**Expected:** none of these elements have any `.os-*` class names applied, and none have computed styles from the `overlayscrollbars` library's base CSS. If any `.os-*` classes leak, the library's CSS import is not properly scoped — report back for investigation.

### Step 6: Vega interaction passthrough

- [ ] **Step 6.1: Click-to-select test**

Use a Vega-Lite spec with a point selection param:
```json
{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "mark": "bar",
    "params": [{ "name": "sel", "select": "point" }],
    "encoding": {
        "x": { "field": "category", "type": "nominal" },
        "y": { "field": "value", "type": "quantitative" },
        "opacity": {
            "condition": { "param": "sel", "value": 1 },
            "value": 0.3
        }
    }
}
```

Click individual bars.

**Expected:** clicks pass through the overlayscrollbars wrapper to the SVG marks, and the selection highlights work. No clicks being swallowed by scrollbar tracks or the wrapper divs.

**If fail:** the library is intercepting pointer events. Look at the library's `options.scrollbars.clickScroll` or `options.scrollbars.dragScroll` flags — one of them may be eating click events. Report back.

### Step 7: Mobile (Power BI mobile app)

- [ ] **Step 7.1: Mobile touch scroll test**

If a Power BI mobile app test environment is available, open the same report and the visual. Attempt to touch-scroll an oversized spec.

**Expected:** touch scroll works smoothly, overlay scrollbars appear during scroll.

**If no mobile test environment is available:** document this as "deferred to user manual check" in the final summary and move on. Desktop verification is sufficient for commit.

### Step 8: Final summary

- [ ] **Step 8.1: Document findings**

Write a short summary of the verification run — what passed, what failed (if anything), and what was deferred. If all checks passed, the branch is ready for PR review.

No commit for this task unless the verification uncovered a bug. If a bug is found, fix it as a small follow-up commit with a clear message ("fix(app-core): …") and re-run the affected verification step.

---

## Self-Review Notes

**Spec coverage check (each spec section → task(s) that implement it):**
- §1 "What stays from the 2026-04-08 work" — pre-flight context section at the top ✓
- §2 Layer 1 — Task 1 ✓
- §3 Layer 2 library choice — Tasks 2, 4, 5 ✓
- §3 Integration in visual-viewer.tsx — Task 4 ✓
- §3 Integration in preview-area.tsx — Task 5 ✓
- §3 Container ID routing — Task 4 Step 4.2 ✓
- §4 Shared helper getScrollbarStyleVars — Task 3 ✓
- §4 Incidental addAlpha padStart fix — Task 3 Step 1.1 test + Step 2.1 implementation ✓
- §5 What gets deleted — Task 6 ✓
- §6 Regression guardrails — Task 7 Steps 5.1-5.5 ✓
- §7 Scroll event contract — Task 4 Steps 4.2 + 5.1 (contract preserved) ✓
- §8 Dependencies — Task 2 ✓
- §9 Testing — Task 1 Step 3 (unit), Task 3 Step 1 (unit), Task 7 (manual) ✓
- §10 Risks — addressed via inline "If fail:" notes in manual verification ✓
- §11 Out of scope — nothing here; the plan only touches the in-scope files ✓
- §12 Build order and commit plan — Tasks 1-7 map to phases 1-5 of the spec (phase 3 = Tasks 3+4, phase 5 = Task 7) ✓

**Placeholder scan:** No TBDs, no "implement appropriate error handling", no "similar to above" — every step has exact code. ✓

**Type / name consistency:**
- `osRef: useRef<OverlayScrollbarsComponentRef>(null)` — used in Task 4 Steps 4.1, 4.2, 5.1, 6.2 ✓
- `scrollbarStyleVars` variable name — used in Task 4 Step 6.1 + 6.2 and Task 5 Steps 4.1 + 5.1 ✓
- `getScrollbarStyleVars` signature `(color, opacity, radius, width)` — consistent across the helper tests (Task 3), visual-viewer (Task 4), and preview-area (Task 5) ✓
- `autosize: { type: 'fit', contains: 'padding' }` — consistent across patcher (Task 1 Step 2.1) and tests (Task 1 Step 3.2) ✓
- `VEGA_CONTAINER_ID` imported in visual-viewer.tsx and assigned to viewport in Task 4 Step 4.2 ✓
- Commit message prefixes: `fix(vega-runtime)`, `chore(app-core)`, `feat(app-core)`, `feat(app-core)`, `feat(app-core)`, `chore(app-core)` — consistent with the project's existing commit history style ✓

**Gaps identified and filled during review:** none.
