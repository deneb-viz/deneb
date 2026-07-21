# Overlay Scrollbars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `react-custom-scrollbars-2` with native CSS overlay scrollbars, fixing issue #480 where the library reserves 6px gutter even when no scrolling is needed.

**Architecture:** A shared `getOverlayScrollbarStyles` factory produces a Griffel style object for static call sites. The visual viewer uses CSS custom properties to support user-configurable dynamic values (color, opacity, radius, width) without re-generating CSS classes at runtime. `useThrottle` from `@uidotdev/usehooks` (already in use) throttles the Vega signal update; the native `scroll` event listener fires `setScrollPosition` immediately.

**Tech Stack:** TypeScript, React 19, Griffel (`makeStyles`/`mergeClasses` from `@fluentui/react-components`), `@uidotdev/usehooks` (`useThrottle`), Vega, Power BI Visuals API, Vitest.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/app-core/src/lib/scrollbars/overlay-styles.ts` | **Create** | Shared `getOverlayScrollbarStyles` factory for static call sites |
| `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts` | **Create** | Unit tests for the factory |
| `packages/configuration/src/index.ts` | **Modify** | Add `scrollbarWidth` to `VISUAL_RENDER_DEFAULTS` |
| `capabilities.json` | **Modify** | Add `scrollbarWidth` integer property to `display` object |
| `src/lib/persistence/model/settings-display.ts` | **Modify** | Add `scrollbarWidth` slider to `SettingsDisplayGroupScrollbars` |
| `stringResources/en-US/resources.resjson` | **Modify** | Add display name + description keys for `scrollbarWidth` |
| `src/lib/state/visual-render-sync-mappings.ts` | **Modify** | Add `scrollbarWidth` sync mapping |
| `packages/app-core/src/state/visual-render.ts` | **Modify** | Add `scrollbarWidth` to state type and initial value |
| `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx` | **Modify** | Replace `<Scrollbars>` with native `<div>` + CSS vars + native scroll listener |
| `packages/app-core/package.json` | **Modify** | Remove `react-custom-scrollbars-2` dependency |

Phase 4 (stretch — only if Phase 1–3 ship cleanly):

| File | Action | Purpose |
|---|---|---|
| `packages/app-core/src/components/visual-viewer/constants.ts` | **Modify** | Remove `VEGA_VIEWPORT_ADJUST` |
| `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx` | **Modify** | Remove `calc(100% - 8px)` workaround |

---

## Task 1: `getOverlayScrollbarStyles` factory

Creates the shared pure-function helper that both internal call sites (Fluent token values) and the visual viewer (via CSS custom properties) can consume via Griffel `makeStyles`.

**Files:**
- Create: `packages/app-core/src/lib/scrollbars/overlay-styles.ts`
- Create: `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getOverlayScrollbarStyles } from '../overlay-styles';

describe('getOverlayScrollbarStyles', () => {
    it('includes overflow: auto', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 8 });
        expect(result.overflow).toBe('auto');
    });

    it('sets webkit scrollbar width and height from width option', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 12 });
        expect(result['::-webkit-scrollbar'].width).toBe('12px');
        expect(result['::-webkit-scrollbar'].height).toBe('12px');
    });

    it('sets webkit thumb border-radius from radius option', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'blue', radius: 6, width: 8 });
        expect(result['::-webkit-scrollbar-thumb'].borderRadius).toBe('6px');
    });

    it('sets webkit thumb background from thumbColor', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'rgba(0,0,0,0.5)', radius: 4, width: 8 });
        expect(result['::-webkit-scrollbar-thumb'].background).toBe('rgba(0,0,0,0.5)');
    });

    it('sets scrollbarColor for Firefox with transparent track', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: '#ff0000', radius: 4, width: 8 });
        expect(result.scrollbarColor).toBe('#ff0000 transparent');
    });

    it('sets scrollbarWidth to thin when width <= 8', () => {
        expect(getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 8 }).scrollbarWidth).toBe('thin');
        expect(getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 1 }).scrollbarWidth).toBe('thin');
    });

    it('sets scrollbarWidth to auto when width > 8', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 9 });
        expect(result.scrollbarWidth).toBe('auto');
    });

    it('accepts a CSS variable string as thumbColor', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'var(--deneb-sb-thumb)', radius: 4, width: 8 });
        expect(result['::-webkit-scrollbar-thumb'].background).toBe('var(--deneb-sb-thumb)');
        expect(result.scrollbarColor).toBe('var(--deneb-sb-thumb) transparent');
    });

    it('sets all track and corner backgrounds to transparent', () => {
        const result = getOverlayScrollbarStyles({ thumbColor: 'red', radius: 4, width: 8 });
        expect(result['::-webkit-scrollbar'].background).toBe('transparent');
        expect(result['::-webkit-scrollbar-track'].background).toBe('transparent');
        expect(result['::-webkit-scrollbar-corner'].background).toBe('transparent');
    });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/app-core && npm run test -- --reporter=verbose 2>&1 | grep -A 3 "overlay-styles"
```

Expected: `Cannot find module '../overlay-styles'`

- [ ] **Step 3: Implement the factory**

Create `packages/app-core/src/lib/scrollbars/overlay-styles.ts`:

```typescript
export type OverlayScrollbarOptions = {
    /** rgba string, token reference, or CSS variable for the thumb */
    thumbColor: string;
    /** thumb border-radius in px (Firefox ignores border-radius) */
    radius: number;
    /** scrollbar track width in px; Firefox maps ≤8 → thin, >8 → auto */
    width: number;
};

/**
 * Pure factory returning a Griffel-compatible style object for overlay scrollbars.
 *
 * Usage in makeStyles:
 *   makeStyles({ root: getOverlayScrollbarStyles({ thumbColor: tokens.colorNeutralForeground3, radius: 4, width: 8 }) })
 *
 * Overlay-on-demand: `overflow: auto` means the scrollbar only appears when content overflows.
 * Firefox renders square thumbs (no border-radius support) — accepted degradation.
 */
export const getOverlayScrollbarStyles = ({
    thumbColor,
    radius,
    width
}: OverlayScrollbarOptions) =>
    ({
        overflow: 'auto',
        // Firefox
        scrollbarWidth: (width <= 8 ? 'thin' : 'auto') as 'thin' | 'auto',
        scrollbarColor: `${thumbColor} transparent`,
        // Webkit (Chromium, Safari, mobile)
        '::-webkit-scrollbar': {
            width: `${width}px`,
            height: `${width}px`,
            background: 'transparent'
        },
        '::-webkit-scrollbar-thumb': {
            background: thumbColor,
            borderRadius: `${radius}px`
        },
        '::-webkit-scrollbar-thumb:hover': {
            background: thumbColor
        },
        '::-webkit-scrollbar-track': {
            background: 'transparent'
        },
        '::-webkit-scrollbar-corner': {
            background: 'transparent'
        }
    }) as const;
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/app-core && npm run test -- --reporter=verbose 2>&1 | grep -A 3 "overlay-styles"
```

Expected: `✓ overlay-styles.test.ts (9 tests)`

- [ ] **Step 5: Commit**

```
git add packages/app-core/src/lib/scrollbars/overlay-styles.ts packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts
```

Commit message: `feat(app-core): add getOverlayScrollbarStyles factory`

---

## Task 2: Add `scrollbarWidth` capability property

Threads the new user-configurable `scrollbarWidth` setting through all five layers that `scrollbarColor`/`scrollbarOpacity`/`scrollbarRadius` already pass through.

**Files:**
- Modify: `packages/configuration/src/index.ts`
- Modify: `capabilities.json`
- Modify: `src/lib/persistence/model/settings-display.ts`
- Modify: `stringResources/en-US/resources.resjson`
- Modify: `src/lib/state/visual-render-sync-mappings.ts`
- Modify: `packages/app-core/src/state/visual-render.ts`

- [ ] **Step 1: Add default to configuration package**

In `packages/configuration/src/index.ts`, add `scrollbarWidth` to `VISUAL_RENDER_DEFAULTS` (currently ends at line 236). Add it after `scrollbarRadius`:

```typescript
export const VISUAL_RENDER_DEFAULTS = {
    scrollbarColor: '#000000',
    scrollbarOpacity: {
        min: 0,
        max: 100,
        default: 20
    },
    scrollbarRadius: {
        min: 0,
        max: 3,
        default: 0
    },
    scrollbarWidth: {
        min: 4,
        max: 16,
        default: 8
    },
    scrollEventThrottle: {
        min: 0,
        max: 1000,
        default: 5
    }
};
```

- [ ] **Step 2: Add capability to `capabilities.json`**

In `capabilities.json` at line 81–90, add `scrollbarWidth` after `scrollbarRadius`:

```json
"scrollbarRadius": {
    "type": {
        "integer": true
    }
},
"scrollbarWidth": {
    "type": {
        "integer": true
    }
},
"scrollEventThrottle": {
```

- [ ] **Step 3: Add i18n strings**

Read `stringResources/en-US/resources.resjson` first, then add after the existing `scrollbarRadius` entries (around line 22):

```json
"Objects_Display_ScrollbarWidth": "Scrollbar width",
"Objects_Display_ScrollbarWidth_Description": "Width of the scrollbars in pixels (Firefox: controls thin/auto hint only).",
```

- [ ] **Step 4: Add settings model property**

In `src/lib/persistence/model/settings-display.ts`, add `scrollbarWidth` slider after `scrollbarRadius` (after line 56), and add it to `slices`:

```typescript
scrollbarWidth = new formattingSettings.Slider({
    name: 'scrollbarWidth',
    displayNameKey: 'Objects_Display_ScrollbarWidth',
    descriptionKey: 'Objects_Display_ScrollbarWidth_Description',
    value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.default,
    options: {
        minValue: {
            value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.min,
            type: 0
        },
        maxValue: {
            value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.max,
            type: 1
        },
        unitSymbol: DEFAULTS.unitSymbols.pixels
    }
});
slices = [this.scrollbarColor, this.scrollbarOpacity, this.scrollbarRadius, this.scrollbarWidth];
```

- [ ] **Step 5: Add sync mapping**

In `src/lib/state/visual-render-sync-mappings.ts`, add the mapping after `scrollbarRadius` (before `scrollEventThrottle`):

```typescript
{
    sliceKey: 'scrollbarWidth',
    getVisualValue: (s) => s.display.scrollbars.scrollbarWidth.value,
    persistence: {
        objectName: 'display',
        propertyName: 'scrollbarWidth'
    }
},
```

- [ ] **Step 6: Add to state slice type and initial value**

In `packages/app-core/src/state/visual-render.ts`:

Update `VisualRenderSliceProperties`:
```typescript
export type VisualRenderSliceProperties = {
    scrollbarColor: string;
    scrollbarOpacity: number;
    scrollbarRadius: number;
    scrollbarWidth: number;
    scrollEventThrottle: number;
};
```

Update initial state inside `createVisualRenderSlice` (add after `scrollbarRadius`):
```typescript
scrollbarWidth: VISUAL_RENDER_DEFAULTS.scrollbarWidth.default,
```

- [ ] **Step 7: Verify build**

```bash
npm run test
```

Expected: all tests pass (no type errors introduced). If there are TypeScript errors about `scrollbarWidth` not existing, verify all 6 files were updated.

- [ ] **Step 8: Commit**

```
git add capabilities.json packages/configuration/src/index.ts src/lib/persistence/model/settings-display.ts stringResources/en-US/resources.resjson src/lib/state/visual-render-sync-mappings.ts packages/app-core/src/state/visual-render.ts
```

Commit message: `feat(app-core): add scrollbarWidth as user-configurable display property`

---

## Task 3: Replace `<Scrollbars>` in visual-viewer.tsx (Phase 1 fix)

This is the primary fix for #480. Replaces the `react-custom-scrollbars-2` wrapper with a native `<div>` styled via CSS custom properties for overlay scrollbars. Keeps the existing `useThrottle`-based scroll signal update pattern.

**Files:**
- Modify: `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx`

**Strategy:**
- CSS custom properties (`--deneb-sb-thumb`, `--deneb-sb-width`, `--deneb-sb-radius`) are set on the container `div` via inline `style`. The Griffel class uses `var(--...)` references.
- `useThrottle(scrollPosition, scrollEventThrottle)` throttles the downstream Vega signal update, exactly as the current `useThrottle(scrollFrame, scrollEventThrottle)` does.
- `addAlpha` is kept as a local utility (converts hex color + 0-1 opacity to hex+alpha string).
- The existing `useScrollbars` logic is preserved: when `isEmbeddedInEditor && !previewScrollbars`, the container uses `overflow: visible` instead.

- [ ] **Step 1: Update state destructuring to include `scrollbarWidth`**

In `visual-viewer.tsx`, find the `useDenebState` call that destructures `scrollbarColor`, `scrollbarOpacity`, `scrollbarRadius`, `scrollEventThrottle`. Add `scrollbarWidth` alongside them:

```typescript
scrollbarColor: state.visualRender.scrollbarColor,
scrollbarOpacity: state.visualRender.scrollbarOpacity,
scrollbarRadius: state.visualRender.scrollbarRadius,
scrollbarWidth: state.visualRender.scrollbarWidth,
scrollEventThrottle: state.visualRender.scrollEventThrottle,
```

Also add `scrollbarWidth` to the destructure list at the top of the component function:
```typescript
const {
    ...
    scrollbarColor,
    scrollbarOpacity,
    scrollbarRadius,
    scrollbarWidth,
    scrollEventThrottle,
    ...
} = useDenebState(...);
```

- [ ] **Step 2: Add overlay scroll Griffel styles**

After the existing `useVisualViewerStyles` definition, add a new `makeStyles` for the scroll container. Add this at module level (not inside the component):

```typescript
const useScrollContainerStyles = makeStyles({
    overlay: {
        overflow: 'auto',
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

- [ ] **Step 3: Add scroll state and container ref**

Inside the `VisualViewer` component, replace the existing scroll state and ref:

```typescript
// Replace:
const [scrollFrame, setScrollFrame] = useState<positionValues | null>(null);
const throttledScrollFrame = useThrottle(scrollFrame, scrollEventThrottle);

// With:
type ScrollPosition = { scrollTop: number; scrollLeft: number };
const containerRef = useRef<HTMLDivElement>(null);
const [scrollPosition, setScrollPosition] = useState<ScrollPosition | null>(null);
const throttledScrollPosition = useThrottle(scrollPosition, scrollEventThrottle);
```

- [ ] **Step 4: Add native scroll event listener**

Add a new `useEffect` after the existing effects, before the `return` statement:

```typescript
useEffect(() => {
    if (!useScrollbars) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
        setScrollPosition({ scrollTop: el.scrollTop, scrollLeft: el.scrollLeft });
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
    // containerRef.current is stable; setScrollPosition is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [useScrollbars]);
```

- [ ] **Step 5: Update the Vega scroll signal effect**

Find the existing effect that updates the Vega `denebContainer` signal on scroll. Replace `throttledScrollFrame` with `throttledScrollPosition`:

```typescript
useEffect(() => {
    if (!throttledScrollPosition || !viewReady) return;
    const view = VegaViewServices.getView();
    if (!view) return;
    const container = view.container();
    if (!container) return;
    const signal = getSignalDenebContainer({
        scroll: {
            height: container.clientHeight ?? 0,
            width: container.clientWidth ?? 0,
            scrollHeight: container.scrollHeight ?? 0,
            scrollWidth: container.scrollWidth ?? 0,
            scrollTop: throttledScrollPosition.scrollTop,
            scrollLeft: throttledScrollPosition.scrollLeft
        }
    });
    VegaViewServices.setSignalByName(signal.name, signal.value);
}, [throttledScrollPosition, viewReady]);
```

- [ ] **Step 6: Replace the `return` statement**

The current `return` renders `<Scrollbars>` when `useScrollbars` is true, and `<>{vegaComponent}</>` when false.

Replace the entire `return` block:

```typescript
const scrollContainerClasses = useScrollContainerStyles();
const resolvedThumbColor = addAlpha(scrollbarColor, scrollbarOpacity / 100);

return (
    <div
        ref={containerRef}
        id={useScrollbars ? VEGA_CONTAINER_ID : undefined}
        className={mergeClasses(
            classes.container,
            useScrollbars ? scrollContainerClasses.overlay : classes.overflowVisible
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

- [ ] **Step 7: Remove unused imports and helpers**

Remove from `visual-viewer.tsx`:
- `import { Scrollbars, type positionValues } from 'react-custom-scrollbars-2';`
- The `CSSProperties` import from React if no longer used elsewhere (check — it WAS used in `getScrollBarThumb`; remove if unused)
- The `HTMLProps` import from React (check if used elsewhere; likely only in thumb helpers)
- The `scrollbarThumbVertical` function
- The `scrollbarThumbHorizontal` function
- The `getScrollBarThumb` function

Keep `addAlpha` — it's still used for `resolvedThumbColor`.

Also remove `getDenebState` import if only the thumb helpers used it (check other usages first).

- [ ] **Step 8: Run tests and verify build**

```bash
npm run test
```

Expected: all tests pass.

```bash
npm run webpack:build 2>&1 | tail -20
```

Expected: webpack build completes without errors.

- [ ] **Step 9: Commit**

```
git add packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx
```

Commit message: `fix(app-core): replace react-custom-scrollbars-2 with native overlay scrollbars (#480)`

---

## Task 4: Verify sweep and remove dependency (Phase 2 + 3)

Phase 2 is trivially satisfied — the Explore pass during planning confirmed `react-custom-scrollbars-2` is only imported in `visual-viewer.tsx`. This task verifies that and removes the package.

**Files:**
- Modify: `packages/app-core/package.json`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "react-custom-scrollbars-2" packages/app-core/src/
```

Expected: no output. If any file appears, migrate it using `getOverlayScrollbarStyles` before continuing.

- [ ] **Step 2: Remove the dependency**

In `packages/app-core/package.json`, remove the `react-custom-scrollbars-2` line from `"dependencies"`:

```json
"react-custom-scrollbars-2": "^4.4.0",
```

Delete that line entirely.

- [ ] **Step 3: Update lockfile**

```bash
npm install
```

Expected: `package-lock.json` updated, `react-custom-scrollbars-2` no longer listed.

- [ ] **Step 4: Verify build and tests**

```bash
npm run test && npm run webpack:build 2>&1 | tail -5
```

Expected: all tests pass, webpack build succeeds.

- [ ] **Step 5: Commit**

```
git add packages/app-core/package.json package-lock.json
```

Commit message: `chore(app-core): remove react-custom-scrollbars-2 dependency`

---

## Task 5 (stretch): Remove `VEGA_VIEWPORT_ADJUST` cleanup (Phase 4)

Only attempt this after Tasks 1–4 are complete and the visual is verified to render to the edges of the Power BI container with no background bleed. If any regression appears, revert this task and leave Tasks 1–4 as the final state.

**Files:**
- Modify: `packages/app-core/src/components/visual-viewer/constants.ts`
- Modify: `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx`

- [ ] **Step 1: Check for other usages of `VEGA_VIEWPORT_ADJUST`**

```bash
grep -r "VEGA_VIEWPORT_ADJUST" packages/app-core/src/
```

Expected: only two hits — `constants.ts` (definition) and `vega-embed.tsx` (usage). If any other file uses it, do not remove and document why.

- [ ] **Step 2: Remove from `vega-embed.tsx`**

In `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx`, find:

```typescript
import { VEGA_VIEWPORT_ADJUST } from '../constants';
```

And the style that uses it:
```typescript
root: {
    height: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`,
    width: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`,
    ...
}
```

Replace with:
```typescript
root: {
    height: '100%',
    width: '100%',
    ...
}
```

Remove the `VEGA_VIEWPORT_ADJUST` import line.

- [ ] **Step 3: Remove from `constants.ts`**

In `packages/app-core/src/components/visual-viewer/constants.ts`, remove the `VEGA_VIEWPORT_ADJUST` export entirely (the JSDoc comment and the `export const` line). Leave `VEGA_CONTAINER_ID`.

- [ ] **Step 4: Verify build and tests**

```bash
npm run test && npm run webpack:build 2>&1 | tail -5
```

Expected: all tests pass, webpack build succeeds.

- [ ] **Step 5: Manual check before committing**

Verify in the Power BI dev server that:
- A fitted spec renders to all four edges of the container (no background bleed)
- An oversized spec (autosize: none) shows scrollbars that sit over content, not reserving gutter

- [ ] **Step 6: Commit**

```
git add packages/app-core/src/components/visual-viewer/components/vega-embed.tsx packages/app-core/src/components/visual-viewer/constants.ts
```

Commit message: `refactor(app-core): remove VEGA_VIEWPORT_ADJUST workaround after #480 fix`

---

## Self-Review Notes

**Spec coverage check:**
- §2 Shared factory — Task 1 ✅
- §3 Visual viewer / scrollbarWidth / scroll listener — Tasks 2 + 3 ✅
- §4 Internal call site sweep — Task 4 Step 1 (grep confirms only one site) ✅
- §5 Dependency removal — Task 4 Steps 2–5 ✅
- §6 VEGA_VIEWPORT_ADJUST cleanup — Task 5 ✅
- §7 Throttle (useThrottle hook kept, no lodash) — Task 3 Steps 3–5 ✅
- §9 Unit tests — Task 1 Step 1 ✅

**Throttle note:** `@uidotdev/usehooks` exports only `useThrottle` (a React hook), not a raw `throttle` function. The plan keeps the existing `useThrottle(scrollPosition, scrollEventThrottle)` pattern — native scroll handler fires `setScrollPosition` immediately; `useThrottle` throttles the downstream Vega signal update. No lodash required.

**Firefox `scrollbar-width`:** The Griffel class hard-codes `scrollbarWidth: 'thin'`. The `--deneb-sb-firefox-width` CSS variable approach was considered but avoided — Firefox's `scrollbar-width` only accepts `auto | thin | none`, not pixel values. `thin` is the correct Firefox value for any user-configured width ≤ 8px (the default range is 4–16px). Users configuring width > 8px will see `thin` in Firefox (accepted degradation).

**`data-table.tsx` and `log-viewer.tsx`:** Neither uses `react-custom-scrollbars-2`. The spec's Phase 2 sweep finds no additional call sites.
