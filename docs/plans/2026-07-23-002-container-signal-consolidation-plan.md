# Container Signal Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One module owns every `denebContainer` write (measured from the scroll container element), and viewport-only changes stop recompiling/re-embedding — a resize costs one debounced signal write.

**Architecture:** Per the approved spec ([2026-07-23-001-container-signal-consolidation-design.md](2026-07-23-001-container-signal-consolidation-design.md)): a `useContainerSignalOwner` hook in the visual-viewer feature merges three triggers (debounced ResizeObserver, throttled scroll, post-embed reconcile) into one guarded write path, all six signal fields measured from the single scroll-container element (1.x-parity semantics). `VegaEmbed` becomes embed-lifecycle only. `VisualViewer`'s compile effect drops viewport deps; compiles read a dims snapshot at call time.

**Tech Stack:** React 19 hooks, zustand (app-core store), Vega runtime signal API (`VegaViewServices`), vitest (jsdom via per-file pragma in app-core; repo precedent = no component render tests, wiring locked by static-source canaries).

**Branch / process notes:**

- All work on `refactor/container-signal-owner` (based on `next`); spec and this plan are committed on this branch before implementation starts.
- Every task ends in a commit. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Task ordering is migration-safe: the owner goes live (Task 3) before `VegaEmbed`'s old write paths are removed (Task 4), and the old pure builder (`getContainerSignalRefresh`) survives until Task 4 so every intermediate commit keeps the shipped #729 behaviour intact. The new builder gets a distinct name (`getMeasuredContainerRefresh`) for this reason — do NOT modify the old one in place.
- `npm run ci:local` gates PR creation (PreToolUse hook on `gh pr create`).
- Commands below assume the matching working directory: app-core tasks run from `packages/app-core/`, root-package tasks from the repo root.

---

### Task 1: Pure builder `getMeasuredContainerRefresh`

Single-element, full six-field read. Unlike the old `getContainerSignalRefresh` (which preserved scroll offsets because it measured the non-scrolling embed wrapper), the measured element here IS the scroll container, so its own `scrollTop`/`scrollLeft` are authoritative — including a legitimate scroll back to 0, which the old preservation logic would have masked with a stale value.

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/container-size-observer.ts`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/container-size-observer.test.ts`

- [ ] **Step 1: Write the failing tests** — append a new `describe` block to `container-size-observer.test.ts` (do not touch the existing `getContainerSignalRefresh` block yet; it dies in Task 4). The file already has a `buildContainer` helper inside the `getContainerSignalRefresh` describe — this block needs its own, extended with scroll offsets:

```ts
describe('getMeasuredContainerRefresh', () => {
    /**
     * jsdom computes no layout — box metrics and scroll offsets are
     * stubbed. Unlike the legacy wrapper-measured builder, the
     * measured element here IS the scroll container, so its own
     * offsets are authoritative.
     */
    const buildMeasuredContainer = (metrics: {
        clientWidth: number;
        clientHeight: number;
        scrollWidth?: number;
        scrollHeight?: number;
        scrollTop?: number;
        scrollLeft?: number;
    }): HTMLElement => {
        const container = document.createElement('div');
        Object.defineProperties(container, {
            clientWidth: { value: metrics.clientWidth },
            clientHeight: { value: metrics.clientHeight },
            scrollWidth: { value: metrics.scrollWidth ?? metrics.clientWidth },
            scrollHeight: {
                value: metrics.scrollHeight ?? metrics.clientHeight
            }
        });
        // scrollTop/scrollLeft are writable on real elements; jsdom
        // allows plain assignment.
        container.scrollTop = metrics.scrollTop ?? 0;
        container.scrollLeft = metrics.scrollLeft ?? 0;
        return container;
    };

    const currentSignal = {
        width: 949,
        height: 682,
        scrollWidth: 949,
        scrollHeight: 1200,
        scrollTop: 250,
        scrollLeft: 10
    };

    it('reads all six fields from the measured scroll container', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 710,
            scrollHeight: 1400,
            scrollTop: 300,
            scrollLeft: 5
        });
        const refresh = getMeasuredContainerRefresh(container, currentSignal);
        expect(refresh?.value).toEqual({
            width: 949,
            height: 710,
            scrollWidth: 949,
            scrollHeight: 1400,
            scrollTop: 300,
            scrollLeft: 5
        });
    });

    it('a container scrolled back to 0 yields offset 0 — no stale preservation', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 682,
            scrollHeight: 1200,
            scrollTop: 0,
            scrollLeft: 0
        });
        const refresh = getMeasuredContainerRefresh(container, currentSignal);
        expect(refresh?.value.scrollTop).toBe(0);
        expect(refresh?.value.scrollLeft).toBe(0);
    });

    it('returns null when there is no current signal (no live view yet)', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 710
        });
        expect(getMeasuredContainerRefresh(container, undefined)).toBeNull();
    });

    it('returns null for a 0×0 container (hidden or tearing down)', () => {
        const container = buildMeasuredContainer({
            clientWidth: 0,
            clientHeight: 0
        });
        expect(
            getMeasuredContainerRefresh(container, currentSignal)
        ).toBeNull();
    });

    it('returns null when the measured value equals the current signal', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 682,
            scrollHeight: 1200,
            scrollTop: 250,
            scrollLeft: 10
        });
        expect(
            getMeasuredContainerRefresh(container, currentSignal)
        ).toBeNull();
    });
});
```

Add `getMeasuredContainerRefresh` to the import list at the top of the test file.

- [ ] **Step 2: Run to verify failure**

Run (from `packages/app-core/`): `npx vitest run src/features/visual-viewer/__tests__/container-size-observer.test.ts`
Expected: FAIL — `getMeasuredContainerRefresh is not a function` (or unresolved import).

- [ ] **Step 3: Implement** — add to `container-size-observer.ts` (below `getContainerSignalRefresh`, which stays untouched):

```ts
/**
 * Build the refreshed `denebContainer` signal from the MEASURED SCROLL
 * CONTAINER, or `null` when no write should happen.
 *
 * All six fields come from the one element: clientWidth/Height (the
 * visible box), scrollWidth/Height (content extent), scrollTop/Left
 * (offsets). The element's own offsets are authoritative — including a
 * legitimate scroll back to 0 — so nothing is preserved from the
 * current value. 1.x-parity semantics; see
 * docs/plans/2026-07-23-001-container-signal-consolidation-design.md.
 *
 * Guards: no current signal (no live view yet) → null; 0×0 container
 * (hidden or tearing-down) → null; value-equal → null (Vega compares
 * signal values by reference — an equal-but-new object still re-runs
 * the dataflow).
 */
export const getMeasuredContainerRefresh = (
    container: HTMLElement,
    current: DenebContainerSignal | undefined
): { name: string; value: DenebContainerSignal } | null => {
    if (current === undefined) return null;
    const signal = getSignalDenebContainer({ container });
    if (signal.value.width === 0 && signal.value.height === 0) return null;
    if (isSameDenebContainerValue(current, signal.value)) return null;
    return signal;
};
```

Note: `getSignalDenebContainer({ container })` reads every field via `container.<prop> || 0`, so a zero offset resolves to 0 with no fallback — exactly the no-stale-preservation behaviour Step 1 asserts.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-size-observer.test.ts`
Expected: PASS (all describes, including the untouched legacy ones).

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/features/visual-viewer/container-size-observer.ts src/features/visual-viewer/__tests__/container-size-observer.test.ts
git add src/features/visual-viewer/container-size-observer.ts src/features/visual-viewer/__tests__/container-size-observer.test.ts
git commit -m "feat: measured-container signal refresh builder (single-element, full read)"
```

---

### Task 2: Owner hook `useContainerSignalOwner`

**Files:**

- Create: `packages/app-core/src/features/visual-viewer/use-container-signal-owner.ts`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts` (static-source canary — the workspace has no `@testing-library/react`, per the precedent documented in `visual-update-history-overlay-gate.test.ts`; the hook's logic pieces are behaviour-tested in Task 1 and the existing observer tests)

- [ ] **Step 1: Write the failing canary**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the container-signal single-owner contract
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md).
 * The workspace defers component/hook render tests (no
 * @testing-library/react); the hook's logic pieces are
 * behaviour-tested in container-size-observer.test.ts, and this locks
 * the wiring.
 */
describe('useContainerSignalOwner wiring', () => {
    const hookSource = readFileSync(
        resolve(__dirname, '..', 'use-container-signal-owner.ts'),
        'utf8'
    );

    it('routes every write through the measured-container builder', () => {
        expect(hookSource).toMatch(/getMeasuredContainerRefresh\(/);
        expect(hookSource).toMatch(/setSignalByName\(/);
    });

    it('registers the debounced ResizeObserver on the measured container', () => {
        expect(hookSource).toMatch(/observeContainerResize\(/);
    });

    it('guards every trigger on isActive (inactive twin must never write the shared singleton)', () => {
        // Three trigger effects, each opening with the isActive guard.
        const guards = hookSource.match(/if \(!isActive/g) ?? [];
        expect(guards.length).toBeGreaterThanOrEqual(3);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: FAIL — `ENOENT` reading `use-container-signal-owner.ts`.

- [ ] **Step 3: Implement the hook**

```ts
import { useCallback, useEffect } from 'react';

import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import {
    SIGNAL_DENEB_CONTAINER,
    type DenebContainerSignal
} from '@deneb-viz/vega-runtime/signals';
import {
    getMeasuredContainerRefresh,
    observeContainerResize
} from './container-size-observer';

export type UseContainerSignalOwnerOptions = {
    /**
     * Whether THIS VisualViewer instance is the single live embed
     * (defect C1). Only the active instance may write the shared
     * `VegaViewServices` singleton's signal.
     */
    isActive: boolean;
    /** Embed-in-flight window flag from the compilation slice. */
    viewReady: boolean;
    /**
     * Already-throttled scroll position (VisualViewer's existing
     * `useThrottle(scrollPosition, scrollEventThrottle)` output).
     * Identity changes per throttled scroll tick; used purely as an
     * effect trigger — field values are re-read from the element.
     */
    throttledScrollPosition: {
        scrollTop: number;
        scrollLeft: number;
    } | null;
    /**
     * The measured scroll container: the OverlayScrollbars viewport
     * (`#deneb-vega-container`) or the plain fallback div when
     * scrollbars are disabled. Null until the element exists (the
     * scrollbars component initializes with `defer`) — effects re-run
     * when it arrives.
     */
    container: HTMLElement | null;
};

/**
 * SINGLE write authority for the `denebContainer` signal
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md).
 * Merges three triggers into one guarded write path, all six fields
 * measured from the one scroll-container element:
 *
 *  - ResizeObserver (150ms trailing debounce) — physical box changes,
 *    including host-late iframe resizes (#480 OoF residual).
 *  - Throttled scroll — offset changes.
 *  - Post-embed reconcile on `viewReady` — a view is born from the
 *    compiled spec's init dims; if the container differed at embed
 *    time and never changes again, the observer has nothing to see.
 *
 * No other code may call `setSignalByName(SIGNAL_DENEB_CONTAINER, …)`.
 */
export const useContainerSignalOwner = ({
    isActive,
    viewReady,
    throttledScrollPosition,
    container
}: UseContainerSignalOwnerOptions): void => {
    const refresh = useCallback(() => {
        if (container === null) return;
        const result = getMeasuredContainerRefresh(
            container,
            VegaViewServices.getSignalByName(SIGNAL_DENEB_CONTAINER) as
                | DenebContainerSignal
                | undefined
        );
        if (result === null) return;
        VegaViewServices.setSignalByName(result.name, result.value);
    }, [container]);

    // Trigger 1: physical box changes (debounced in the observer).
    useEffect(() => {
        if (!isActive || container === null) return;
        return observeContainerResize(container, refresh);
    }, [isActive, container, refresh]);

    // Trigger 2: post-embed reconcile (born-stale case).
    useEffect(() => {
        if (!isActive || !viewReady) return;
        refresh();
    }, [isActive, viewReady, refresh]);

    // Trigger 3: throttled scroll. Gated on viewReady like the
    // pre-consolidation scroll effect — before the view exists there
    // is no signal to update.
    useEffect(() => {
        if (!isActive || !viewReady || throttledScrollPosition === null) return;
        refresh();
    }, [isActive, viewReady, throttledScrollPosition, refresh]);
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/features/visual-viewer/use-container-signal-owner.ts src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git add src/features/visual-viewer/use-container-signal-owner.ts src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git commit -m "feat: useContainerSignalOwner — single write authority for denebContainer"
```

---

### Task 3: Wire the owner into `VisualViewer`, retire its scroll-signal effect

The owner goes live here. `VegaEmbed`'s old write paths remain until Task 4 (both write the same guarded values — harmless overlap for one commit; removing them first would leave a gap).

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`

- [ ] **Step 1: Extend the canary (failing first)** — add to the existing describe in `container-signal-owner-wiring.test.ts`:

```ts
const viewerSource = readFileSync(
    resolve(__dirname, '..', 'components', 'visual-viewer.tsx'),
    'utf8'
);

it('VisualViewer wires the owner hook', () => {
    expect(viewerSource).toMatch(/useContainerSignalOwner\(\{/);
});

it('VisualViewer no longer writes the signal itself', () => {
    // The old scroll effect built the signal directly; after
    // consolidation the component must not touch the signal API.
    expect(viewerSource).not.toMatch(/getSignalDenebContainer/);
    expect(viewerSource).not.toMatch(/setSignalByName/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: FAIL — both new tests (hook not wired; old scroll effect still present).

- [ ] **Step 3: Implement in `visual-viewer.tsx`**

3a. Imports — remove `getSignalDenebContainer` from the `@deneb-viz/vega-runtime/signals` import (delete the whole import line if nothing else remains from it); add:

```ts
import { useContainerSignalOwner } from '../use-container-signal-owner';
```

3b. Measured-element capture — add state next to the existing `osRef` declaration:

```ts
// The measured scroll container for the denebContainer signal
// owner. Captured as STATE (not a ref) so the owner hook's effects
// re-run when the element appears — the scrollbars component
// initializes with `defer`, so the viewport element exists only
// after its `initialized` event.
const [osViewportElement, setOsViewportElement] = useState<HTMLElement | null>(
    null
);
const [fallbackElement, setFallbackElement] = useState<HTMLDivElement | null>(
    null
);
const measuredContainer = useScrollbars ? osViewportElement : fallbackElement;
```

(Place after the `useScrollbars` memo so it can reference it.)

3c. In `scrollbarEvents`' `initialized` callback, capture the element (the memo's `[]` deps stay valid — state setters are stable):

```ts
            initialized: (instance) => {
                instance.elements().viewport.id = VEGA_CONTAINER_ID;
                setOsViewportElement(instance.elements().viewport);
            },
```

3d. Attach the fallback ref on the non-scrollbars branch of the return:

```tsx
<div
    ref={setFallbackElement}
    className={mergeClasses(classes.container, classes.overflowVisible)}
>
    {vegaComponent}
</div>
```

3e. Wire the owner (place after the `throttledScrollPosition` declaration and the `isActive`/`viewReady` reads, before the return):

```ts
useContainerSignalOwner({
    isActive,
    viewReady,
    throttledScrollPosition,
    container: measuredContainer
});
```

3f. Delete the old scroll-signal effect entirely (the `useEffect` whose body starts with the comment `// Don't update scroll signal if view isn't ready or scroll position not set` and calls `VegaViewServices.setSignalByName`). The `osRef` is still used by the `OverlayScrollbarsComponent` `ref` prop and nothing else after this deletion — if it now has no consumers besides the prop, keep the prop wiring as-is (removal is out of scope).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: PASS. Then run the full feature: `npx vitest run src/features/visual-viewer` — expected PASS.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/features/visual-viewer/components/visual-viewer.tsx src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git add src/features/visual-viewer/components/visual-viewer.tsx src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git commit -m "feat: wire container signal owner into VisualViewer; retire scroll-signal effect"
```

---

### Task 4: Strip `VegaEmbed` to embed-lifecycle only; delete the legacy builder

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/components/vega-embed.tsx`
- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx` (drop the two viewport props at the call site)
- Modify: `packages/app-core/src/features/visual-viewer/container-size-observer.ts` (delete `getContainerSignalRefresh`)
- Modify: `packages/app-core/src/features/visual-viewer/__tests__/container-size-observer.test.ts` (delete the legacy `getContainerSignalRefresh` describe)
- Delete: `packages/app-core/src/features/visual-viewer/__tests__/vega-embed-container-observer.test.ts` (superseded by the owner-wiring canary)
- Test: `packages/app-core/src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`

- [ ] **Step 1: Extend the canary (failing first)** — add to the owner-wiring describe:

```ts
const embedSource = readFileSync(
    resolve(__dirname, '..', 'components', 'vega-embed.tsx'),
    'utf8'
);

it('VegaEmbed is embed-lifecycle only — no signal writes, no observers', () => {
    expect(embedSource).not.toMatch(/observeContainerResize/);
    expect(embedSource).not.toMatch(/getContainerSignalRefresh/);
    expect(embedSource).not.toMatch(/getMeasuredContainerRefresh/);
    expect(embedSource).not.toMatch(/setSignalByName/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: FAIL — the new test only.

- [ ] **Step 3: Strip `vega-embed.tsx`**

Remove, in order:

1. The `refreshContainerSignal` `useCallback` and its JSDoc.
2. The post-embed reconcile `useEffect` (deps `[isActive, viewReady, refreshContainerSignal]`) and its JSDoc.
3. The ResizeObserver `useEffect` (deps `[isActive, refreshContainerSignal]`) and its JSDoc.
4. The import of `{ getContainerSignalRefresh, observeContainerResize }` from `'../container-size-observer'`.
5. `SIGNAL_DENEB_CONTAINER` and `type DenebContainerSignal` from the signals import IF nothing else in the file references them after the removals (search the file; `getSignalDenebContainer` was already gone). Delete the whole import line if empty.
6. The `viewportHeight` / `viewportWidth` props: from `VegaEmbedProps`, the destructure, and the `logRender` effect (remove the two fields and their entries in that effect's dep array).

Then in `visual-viewer.tsx`: remove `viewportHeight={viewportHeight}` and `viewportWidth={viewportWidth}` from the `<VegaEmbed …/>` JSX, and remove `viewportHeight` / `viewportWidth` from the `vegaComponent` `useMemo` dependency array. (The state selector's `viewportHeight`/`viewportWidth` entries survive until Task 5 — the compile and data-change effects still read them.)

7. Delete `getContainerSignalRefresh` (function + JSDoc) from `container-size-observer.ts`, delete its `describe` block and its `buildContainer` helper from `container-size-observer.test.ts`, and remove it from that test file's import list.
8. Delete `__tests__/vega-embed-container-observer.test.ts`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/visual-viewer` — expected PASS.
Run: `npx vitest run` (full app-core) — expected PASS (catches any other consumer of the deleted export; the architecture-boundaries canary also runs here).

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/features/visual-viewer/components/vega-embed.tsx src/features/visual-viewer/components/visual-viewer.tsx src/features/visual-viewer/container-size-observer.ts src/features/visual-viewer/__tests__/container-size-observer.test.ts src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git add -A src/features/visual-viewer
git commit -m "refactor: VegaEmbed is embed-lifecycle only; delete legacy wrapper-measured builder"
```

---

### Task 5: Compile reads a dims snapshot; viewport deps removed

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`

- [ ] **Step 1: Extend the canary (failing first)**:

```ts
it('compile effects do not depend on viewport dimensions (resizes are signal-only)', () => {
    // Any dependency-array entry for viewportHeight/Width would
    // reintroduce recompile-on-resize. The dims reach compiles via
    // the call-time snapshot instead.
    expect(viewerSource).not.toMatch(/viewportHeight,/);
    expect(viewerSource).not.toMatch(/viewportWidth,?\s*\]/);
    expect(viewerSource).toMatch(/getCompileDimensionsSnapshot/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
Expected: FAIL — the new test only.

- [ ] **Step 3: Implement in `visual-viewer.tsx`**

3a. Change the state import to include non-reactive access:

```ts
import { getDenebState, useDenebState } from '../../../state';
```

3b. Remove `viewportHeight` and `viewportWidth` from the `useDenebState` selector object (both the destructure and the two selector lines).

3c. Add a ref-backed snapshot helper (after the `measuredContainer` declaration from Task 3). The ref keeps the helper's identity stable so adding it to compile-effect deps cannot retrigger compiles when the element appears:

```ts
// Snapshot source for compile-time container dimensions. A ref
// (synced by effect) rather than a direct closure over
// `measuredContainer`, so the snapshot helper stays
// identity-stable and never retriggers the compile effects.
const measuredContainerRef = useRef<HTMLElement | null>(null);
useEffect(() => {
    measuredContainerRef.current = measuredContainer;
}, [measuredContainer]);

/**
 * Dimensions seed for a compile, read AT CALL TIME — deliberately
 * not reactive; viewport-only changes are signal-only (see
 * docs/plans/2026-07-23-001-container-signal-consolidation-design.md).
 * Prefers the measured container when laid out; falls back to the
 * committed embedViewport (initial mount, pre-layout). The seed
 * only initializes the denebContainer signal — the owner's
 * post-embed reconcile corrects any born-stale delta.
 */
const getCompileDimensionsSnapshot = useCallback(() => {
    const container = measuredContainerRef.current;
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        return {
            width: container.clientWidth,
            height: container.clientHeight
        };
    }
    const embedViewport = getDenebState().interface.embedViewport;
    return {
        width: embedViewport?.width ?? 0,
        height: embedViewport?.height ?? 0
    };
}, []);
```

(`useRef` and `useCallback` are already imported in this file.)

3d. In the **compile effect** (the one whose body logs `'VisualViewer: Triggering compilation'`): replace `containerDimensions: { width: viewportWidth, height: viewportHeight }` with `containerDimensions: getCompileDimensionsSnapshot()`; replace the `viewportHeight`/`viewportWidth` fields in its `logDebug` payload with `dimensions: getCompileDimensionsSnapshot()` — or simply remove those two log fields; remove `viewportHeight` and `viewportWidth` from the dep array and add `getCompileDimensionsSnapshot` (stable, so this is inert).

3e. In the **data-change effect** (the one calling `compileSpec` on `dataChangeAction === 'recompile'` and in `performIncrementalUpdate`'s `onFailure`): same replacement at both `containerDimensions:` sites; remove `viewportHeight` / `viewportWidth` from its dep array and add `getCompileDimensionsSnapshot`.

3f. In the `logRender('VisualViewer', …)` effect: remove the `viewportHeight`/`viewportWidth` fields and their dep-array entries.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run` (full app-core) — expected PASS.
Run: `npx tsc --noEmit` from the repo root after `npx turbo run build --filter=@deneb-viz/app-core` — expected clean (verifies no remaining reader of the removed selector fields).

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/features/visual-viewer/components/visual-viewer.tsx src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git add src/features/visual-viewer/components/visual-viewer.tsx src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts
git commit -m "perf: viewport-only changes no longer recompile — compiles read a dims snapshot"
```

---

### Task 6: Relabel the dev overlay's compiled-dims lines

The stored compilation result's `denebContainer` init no longer tracks resizes; the overlay must say so or it will mislead the next investigation.

**Files:**

- Modify: `src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx` (repo root package)

- [ ] **Step 1: Edit** — in the `lines` array, change the two labels `cd.w` → `ci.w` and `cd.h` → `ci.h`, and update the comment above the `compilationResult` selector to:

```ts
// The dimensions the last compile baked into the patched spec's
// `denebContainer` signal init (`ci.*` = compile init). Since the
// container-signal consolidation, resizes are signal-only — these
// values are a SEED captured at compile time and do NOT track
// resizes. Divergence from ev/ct after a resize is expected and
// healthy; only a divergence at embed time matters.
```

Also update the component JSDoc sentence mentioning `cd.*` to use `ci.*` and the same "compile-time seed" meaning.

- [ ] **Step 2: Verify**

Run from repo root: `npx tsc --noEmit && npx vitest run --config vitest.root.config.ts` — expected clean / PASS.

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx
git add src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx
git commit -m "docs: overlay cd.* relabeled ci.* — compile-time seed, not live dims"
```

---

### Task 7: Full verification sweep

- [ ] **Step 1:** From `packages/app-core/`: `npx vitest run` — expected all PASS.
- [ ] **Step 2:** From repo root: `npx turbo run build --filter=@deneb-viz/app-core` then `npx tsc --noEmit` then `npx vitest run --config vitest.root.config.ts` — expected clean / all PASS (includes the OoF replay suite, which must be untouched by this refactor).
- [ ] **Step 3:** From repo root: `npm run ci:local` — expected `CI LOCAL: ALL CHECKS PASSED`.
- [ ] **Step 4:** Desktop manual matrix (maintainer, `npm run dev`, both overlays enabled): resize storm; OoF click-on/click-off (view recovers, no recompile — `ci.h` stays at the seed while `cv.h` tracks); scroll then resize (offsets survive); scroll back to 0 then resize (offset stays 0); editor preview resize; zoom change (still recompiles — expected); a Vega-Lite spec; scrollbars on and off.
- [ ] **Step 5:** No commit (nothing changed) — fix-forward any failures within the task that caused them.

---

### Task 8: Compound-engineering step

- [ ] **Step 1:** Invoke `/compound-engineering:ce-compound` (lightweight mode is sufficient — this session holds the context). Expected output: a knowledge-track doc under `docs/solutions/architecture-patterns/` capturing the single-owner signal pattern: one write authority per shared runtime value, element-measured truth vs update-predicted truth, the migration-safe strangler ordering (new owner live before old writers removed), and the 1.x-parity verification method (measure semantics against the release tag, not memory).
- [ ] **Step 2:** Validate frontmatter (`python3 <plugin>/scripts/validate-frontmatter.py <doc>`), prettier, commit on this branch:

```bash
git add docs/solutions/architecture-patterns/<doc>.md
git commit -m "docs: compound learning — single-owner container signal pattern"
```

---

### Task 9: PR

- [ ] **Step 1:** Confirm the branch contains: spec (`docs/plans/2026-07-23-001-…-design.md`), this plan (`…-002-…-plan.md`), Tasks 1–6 commits, and the compound doc. `git log --oneline origin/next..HEAD` to review.
- [ ] **Step 2:** Invoke `/compound-engineering:ce-commit-push-pr`. Push and create the PR with `gh pr create --base next` (NOT the default base — `main` is reserved for hotfixes). Title: `perf: consolidate denebContainer ownership; resizes are signal-only`. Body: summary of the two problems (compiler hammered on resize; fragmented signal ownership), the single-owner architecture, the behaviour change (view survives resizes, runtime state preserved — accepted for 2.0), 1.x measurement parity note, links to spec/plan/#729/#480.

---

## Self-Review (completed at write time)

- **Spec coverage:** owner module + measured element + trigger merge → Tasks 1–3; VegaEmbed embed-lifecycle only → Task 4; compile snapshot + dep removal → Task 5; overlay relabel → Task 6; testing matrix → Tasks 1–5 canaries/units + Task 7; VL untouched (no task needed — verified no VL-specific sizing code changes); rollout (branch → PR to next) → Task 9; compound step (user request) → Task 8.
- **Deviation note (documented, intentional):** the spec's trigger table says resize "preserves scroll fields" and scroll "preserves size fields". Because the consolidated design measures ONE element that owns both box and offsets, a full six-field read is always coherent and "preserve" vs "re-read" are equivalent — except in the scrolled-back-to-0 case, where preservation would be a bug (stale offset). Task 1 implements the full read and tests that case explicitly. This satisfies the spec's intent (single-element truth) while correcting a latent flaw in its mechanics table.
- **Type consistency:** `getMeasuredContainerRefresh(container, current)` used identically in Tasks 1, 2, 4; `UseContainerSignalOwnerOptions` fields match the Task 3 call site; `getCompileDimensionsSnapshot` introduced and referenced only in Task 5 + canary.
- **No placeholders:** every code step carries the code; every run step names the command and expected outcome.
