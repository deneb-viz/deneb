# Overlay Scrollbars v2 — Design Spec

## Goal

Resolve two independent bugs left from the [2026-04-08 overlay-scrollbars work](./2026-04-08-overlay-scrollbars-design.md):

1. **The Vega SVG renders 10px larger than its container** in both dimensions, causing unwanted scrollbars on specs that should fit exactly. Root cause appears to be the default Vega-Lite `padding: 5` being added *outside* the container when `width: 'container'` / `height: 'container'` are injected.
2. **The scroll container's scrollbars render as browser defaults**, not as the overlay-styled scrollbars the user has configured. User settings for width and radius have no effect. DevTools inspection shows that `scrollbar-width: thin` and `scrollbar-color` on the element cause modern Chromium to switch to its standard scrollbar path, silently ignoring the `::-webkit-scrollbar*` pseudo-element rules. `overflow: overlay` is aliased to `overflow: auto` in current Chromium, so the gutter is also reserved.

Issue #480 remains the user-facing driver: the Power BI visual background should not bleed at the edges when the chart fits its container.

## Architecture

Two independent layers, buildable and testable in isolation:

| Layer | Where | Fixes |
|---|---|---|
| **Layer 1** | `patchVegaLiteResponsiveSizing` in `@deneb-viz/vega-runtime` | The 10px SVG overflow. Makes fitted specs genuinely fit. |
| **Layer 2** | `visual-viewer.tsx` + `preview-area.tsx` in `@deneb-viz/app-core` | Scrollbar rendering when overflow *is* legitimate. Replaces the native `<div>` + CSS approach with `overlayscrollbars`, giving true overlay behavior (zero gutter reservation) and fully styled scrollbars driven by user settings. |

Layer 1 is verified first. If Layer 1 works, the fitted case shows no scrollbars at all and Layer 2's behavior is only observable on genuinely-overflowing specs.

**Reframing of #480:** the previous spec assumed "overlay scrollbars" were the goal. That was a means, not an end. The real goal is "no unnecessary scrollbars and no background bleed on fitted specs". Layer 1 achieves this directly; Layer 2 only matters for the (less common) case of a legitimately-overflowing spec.

## Tech Stack

TypeScript, React 19, Fluent UI v9 (Griffel `makeStyles`/`tokens`), Vega/Vega-Lite 6, Power BI Visuals API, Vitest. New dependency: `overlayscrollbars` + `overlayscrollbars-react`.

Browser targets: Power BI Desktop (WebView2 / Chromium), Power BI Service (browser-dependent, Chromium-majority), Power BI mobile (Chromium on Android, WebKit on iOS).

---

## 1. What stays from the 2026-04-08 work

The following commits on `feat/scrollbars-container-fit` remain valid and are not reverted:

- `e15c74c5 feat(app-core): add getOverlayScrollbarStyles factory` — ⚠ the **factory itself is deleted** in this spec (see §7), but the architectural decision to have a shared module for scrollbar styling is preserved, now embodied by `getScrollbarStyleVars`.
- `9b8d449b feat(app-core): add scrollbarWidth as user-configurable display property` — **kept**. The capability, state, i18n, persistence, and sync mapping additions remain valid; only the rendering path changes.
- `dcbaf06d fix(app-core): replace react-custom-scrollbars-2 with native overlay scrollbars` — **partially kept**. The scroll-event throttling via `useThrottle(scrollPosition, scrollEventThrottle)` and the `denebContainer` signal wiring remain. The `useScrollContainerStyles` Griffel block and the `overflow: overlay` container are replaced.
- `0237c2ef chore(app-core): remove react-custom-scrollbars-2 dependency` — **kept**. That library is not re-added.
- `3b9c2fad refactor(app-core): remove VEGA_VIEWPORT_ADJUST workaround` — **kept**. The `calc(100% - 8px)` hack is not restored; once Layer 1 is fixed, vega-embed's root stays at `100%`.

The unstaged `overflow: 'overlay' as 'auto'` hack in `visual-viewer.tsx` is discarded — `overlayscrollbars` replaces the native overflow container entirely.

---

## 2. Layer 1 — fix the 10px SVG overflow

### Problem

For a fitted Vega-Lite spec (no user-set `width`/`height`/`padding`), Deneb's `patchVegaLiteResponsiveSizing` injects `width: 'container'` and `height: 'container'`. The rendered SVG is then `containerWidth + 10` × `containerHeight + 10` — exactly 2×5px larger in both dimensions.

DOM evidence from a 364×252 Power BI viewport:
```html
<svg width="374" height="262" viewBox="0 0 374 262">
    <g transform="translate(37,0)">...y-axis...</g>
    <!-- inner chart area is 336×230 -->
</svg>
```

The 10px is exactly the default Vega-Lite `padding: 5` applied on each side of the chart area. `336 (chart) + 37 (y-axis column) + 1 (axis stroke) ≈ 374`, consistent with padding being added *outside* the container.

### Yesterday's failed attempt

The 2026-04-08 plan patched `padding: 0` into the spec via `mergician(spec, { padding: 0 })`. Testing showed this didn't resolve the 10px. The root cause was presumed to be "mergician drops falsy values". **That presumption is incorrect** — `mergician({a: 5}, {a: 0})` correctly produces `{a: 0}`. The fix failed for some other reason.

### Investigation plan

Before committing to a fix, confirm the actual cause. Hypothesis tree, ordered by likelihood:

**H1. Vega-Lite's `autosize.contains` defaults to `'content'`, which adds padding outside the container.**
The Vega-Lite docs state: *"If `contains` is `'content'` (the default), the total size of a view, including padding, will be larger than the specified width and height. If `contains` is `'padding'`, padding is included in the specified width/height."* With `width: 'container'`, the chart interior is set to the container width, and padding is added on top → SVG is `container + 2×padding`. Setting `autosize: { type: 'fit', contains: 'padding' }` should make the total rendered SVG (including padding) fit inside the container. **This is the most likely real fix** and also explains why `padding: 0` alone didn't work — `padding: 0` correctly set the value, but Vega-Lite's autosize math still added layout offsets equivalent to the padding on top.

**H2. The patch is applied to the pre-normalized spec, and normalization overwrites it.**
`patchVegaLiteResponsiveSizing` casts to `ReturnType<typeof normalize>` without actually calling `normalize()`. If normalization adds default padding back, our patch is lost. Less likely — we'd see symptoms beyond just padding if this were true — but testable.

**H3. `config.padding` from the user's config or `PROJECT_DEFAULTS.config` is overriding `spec.padding`.**
Already ruled out for `PROJECT_DEFAULTS` (no padding defined). Possible per-user. Low likelihood as a universal cause.

**H4. Scrollbar gutter reservation adding 10px.**
The old `react-custom-scrollbars-2` library reserved ~6px gutters, not 10px. Native `overflow: auto` in Chromium reserves ~15-17px per axis. Neither matches 10px in both dimensions exactly. Rule out via DevTools.

### Decisive diagnostic

Open Deneb's **"Edit Vega Spec"** pane on a fitted bar chart. The pane shows the compiled Vega spec that vega-embed actually runs. Look at:
- Top-level `padding` value
- `autosize` object (is `contains: 'content'` present?)
- `signals` array for any `width`/`height`-related entries

The compiled Vega spec is authoritative — whatever it says, that's what the rendered SVG reflects. This single inspection distinguishes H1 from H2/H3/H4.

### Expected fix (pending confirmation)

Replace the current `padding: 0` injection in `patchVegaLiteResponsiveSizing` with an `autosize` injection:

```typescript
if (injectingContainerSizing && (normalized as any).autosize === undefined) {
    (patches as any).autosize = { type: 'fit', contains: 'padding' };
}
```

**Why this form:**
- `type: 'fit'` — explicit, matches Vega-Lite's default for `width/height: 'container'` but makes the intent documented
- `contains: 'padding'` — the actual fix. Makes `container + padding` fit within the container, not the chart area alone
- Only applied when the user has not set `autosize` themselves, so we preserve user intent
- Only applied when container sizing is being injected by us, so unrelated specs (with explicit `width: 400`) are untouched
- Padding itself is *not* zeroed — this means a user with `padding: 10` still gets 10px of visible padding inside their chart area, just compressed inside the container instead of blowing it out

**If investigation shows H2 or H3 instead:**
- H2 fix: call `normalize()` explicitly before the patch
- H3 fix: zero `config.padding` in `patchConfig` when the spec uses container sizing (requires coordination between the two patchers)

### Files touched (Layer 1)

- `packages/vega-runtime/src/lib/spec-processing/patch-vega-lite.ts` — replace the `padding: 0` injection with the `autosize` injection (per investigation)
- `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-vega-lite.test.ts` — remove the two unstaged padding tests; add `autosize` injection tests

### Layer 1 unit tests

- `patchVegaLiteResponsiveSizing` injects `autosize: { type: 'fit', contains: 'padding' }` when injecting container sizing
- User-set `autosize` is preserved (not clobbered by the injection)
- Specs with explicit `width`/`height` (no container injection) do not get `autosize` injected
- Non-standard layouts (concat/hconcat/vconcat/facet) still bail out early, unchanged

### Layer 1 manual verification

1. Fitted bar chart on a 364×252 viewport → SVG dimensions == viewport dimensions (DevTools)
2. Spec with `padding: 20` → chart area is `container - 40` on each axis, still fits inside container
3. Spec with explicit `width: 800, height: 600` on a 400×300 viewport → still overflows, scrollbars appear (this is Layer 2's responsibility)
4. Spec with user `autosize: { type: 'none' }` → unchanged, Deneb does not override

---

## 3. Layer 2 — overlay scrollbar library

### Library choice: `overlayscrollbars` v2 + `overlayscrollbars-react`

**Selection rationale:**
- **True overlay behavior** — renders custom scrollbar divs absolutely positioned over content. Zero gutter reservation. This is the behavior modern Chromium CSS can no longer provide natively.
- **Bundle footprint** — ~37 KB core + ~3 KB React wrapper. Net delta after removing `react-custom-scrollbars-2` (already done) is ~+15 KB. Well within the ~1 MB Power BI bundle budget.
- **CSS custom property theming** — `--os-size`, `--os-handle-bg`, `--os-handle-border-radius`, `--os-handle-interactive-area-offset`. Maps 1:1 to the user-configurable settings.
- **No DOM/shadow DOM hacks** — uses ResizeObserver + MutationObserver. Works in Power BI's iframe sandbox without special handling.
- **Scroll event forwarding** — `events.scroll` on the component gives access to the viewport element's `scrollTop`/`scrollLeft`, which we feed into the existing `setScrollPosition` state hook.
- **Accessibility** — keyboard, wheel, touch, screen reader, all handled by the library.
- **Licensing** — MIT.
- **Maintenance** — KingSora actively maintains the project; 2.x is stable.

Rejected alternatives:
- `simplebar-react` — React wrapper is less actively maintained, styling API is less flexible
- Hand-rolled implementation — accessibility and cross-platform edge cases cost more to get right than the 37 KB is worth

### Scoping the library's CSS

**Critical constraint** (set by the user): the log viewer, data table, settings pane, Monaco editor, and any other `@deneb-viz/app-core` overflow containers currently look correct and must not change. The library's base CSS must not leak to them.

`overlayscrollbars`'s base CSS is required only on elements that host an `OverlayScrollbarsComponent`. The `overlayscrollbars/overlayscrollbars.css` base styles are scoped by `.os-*` class selectors that the library applies to its own wrapper divs — they do not leak to siblings or arbitrary elements. Importing the CSS is safe.

**Import strategy:** use a side-effect import `import 'overlayscrollbars/overlayscrollbars.css'` at the top of both `visual-viewer.tsx` and `preview-area.tsx`. Modern bundlers dedupe CSS side-effect imports by module specifier, so the CSS ends up in the bundle exactly once regardless of how many files import it. Both files importing it independently means each file is self-contained — if one is later moved or refactored, the other still works. Verify after implementation via DevTools that no `.os-*` rules apply to `.fui-*` (Fluent UI) elements elsewhere in the app.

If any leakage is observed, fall back to inlining only the required reset into a Griffel block scoped to the two target elements. This is a backup only — the library's author documents the CSS as scoped.

### Integration in `visual-viewer.tsx`

**Remove:**
- `useScrollContainerStyles` Griffel block (the entire `.overlay` class with `::-webkit-scrollbar*` rules)
- `overflow: 'overlay' as 'auto'` unstaged hack
- Manual `useEffect` that attaches a native `scroll` listener to `containerRef.current`
- Local `addAlpha` helper (moves to the shared module, see §4)

**Keep:**
- `useScrollbars` memo (`!isEmbeddedInEditor || previewScrollbars`)
- `useThrottle(scrollPosition, scrollEventThrottle)` — unchanged
- The effect that feeds `throttledScrollPosition` into `getSignalDenebContainer` → `VegaViewServices.setSignalByName` — unchanged semantics
- State destructuring for the five user settings
- `VEGA_CONTAINER_ID` routing — must still be discoverable by outside code (see "Container ID routing" below)

**Replace the `return` block:**

```tsx
import { OverlayScrollbarsComponent, type OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';
import { getScrollbarStyleVars } from '../../../lib/scrollbars/scrollbar-style-vars';

// ...inside VisualViewer component:
const osRef = useRef<OverlayScrollbarsComponentRef>(null);

// Route the denebContainer scroll signal through the library's viewport
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
}, [useScrollbars]);

// Route the container ID to the viewport element for outside consumers
useEffect(() => {
    if (!useScrollbars) return;
    const viewport = osRef.current?.osInstance()?.elements().viewport;
    if (viewport) viewport.id = VEGA_CONTAINER_ID;
    return () => {
        if (viewport) viewport.removeAttribute('id');
    };
}, [useScrollbars]);

const styleVars = getScrollbarStyleVars(
    scrollbarColor,
    scrollbarOpacity,
    scrollbarRadius,
    scrollbarWidth
);

return useScrollbars ? (
    <OverlayScrollbarsComponent
        ref={osRef}
        className={classes.container}
        style={styleVars}
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
    <div className={mergeClasses(classes.container, classes.overflowVisible)}>
        {vegaComponent}
    </div>
);
```

**Option choices explained:**
- `autoHide: 'never'` — scrollbars stay visible whenever overflow exists. Matches the old `react-custom-scrollbars-2` behavior. A fade-on-idle mode is out of scope.
- `visibility: 'auto'` — scrollbars appear only when overflow exists, vanish when content fits. This is the piece that makes Layer 2 play nicely with Layer 1.
- `overflow: { x: 'scroll', y: 'scroll' }` — enables both axes. The library's `scroll` mode is what lets `visibility: auto` take effect per-axis.
- `defer` — defers initialization until the browser is idle. Prevents hitches during first render.

### Integration in `preview-area.tsx`

The preview area has its own outer scroll container (for when editor zoom or viewport size exceeds the visible preview area). It currently uses `shorthands.overflow('overlay')` which has the same Chromium aliasing problem.

**Remove:**
- `shorthands.overflow('overlay')` from `usePreviewStyles.previewArea`

**Add:**
- `OverlayScrollbarsComponent` wrapping the existing `<div className={classes.previewArea}>` content
- Subscription to the four user settings via `useDenebState` (same selector as `visual-viewer.tsx`)
- `getScrollbarStyleVars(...)` applied as inline style, merged with the existing `styleVars` (`--vp-*` custom properties)

**Do not add:**
- Scroll event wiring — the outer preview scroll does not feed the `denebContainer` signal; only the inner `VisualViewer`'s scroll matters

**Updated return:**

```tsx
return (
    <VegaViewProvider>
        <OverlayScrollbarsComponent
            className={classes.previewArea}
            style={{ ...styleVars, ...scrollbarStyleVars }}
            options={{
                scrollbars: { autoHide: 'never', visibility: 'auto' },
                overflow: { x: 'scroll', y: 'scroll' }
            }}
            defer
        >
            <div className={mergeClasses(...)}>
                <div id='deneb-visual-preview' className={classes.previewContainer}>
                    <VisualViewer isEmbeddedInEditor schemaValidator={schemaValidator} />
                </div>
            </div>
        </OverlayScrollbarsComponent>
    </VegaViewProvider>
);
```

The existing CSS custom properties (`--vp-height`, `--vp-width`, `--vp-border`, `--vp-scale`) stay on the same style object and coexist with the scrollbar vars.

### Container ID routing

`VEGA_CONTAINER_ID` (`deneb-vega-container`) is used by outside code (tests, debugging, possibly CSS) to find the viewer. With `overlayscrollbars`, the DOM structure becomes:

```
<OverlayScrollbarsComponent> (host element)
  └─ <div class="os-padding">
      └─ <div class="os-viewport"> ← this is where scroll lives
          └─ <div class="os-content">
              └─ <VegaEmbed>
```

The ID must be assigned to `.os-viewport` (the element whose `scrollTop`/`scrollLeft` are meaningful), not to the host element. This is done in the post-mount `useEffect` shown above, reading `instance.elements().viewport` and setting its `id` attribute directly. Cleanup removes the id on unmount.

---

## 4. Shared helper: `getScrollbarStyleVars`

### Module location

`packages/app-core/src/lib/scrollbars/scrollbar-style-vars.ts`

### Purpose

Both `visual-viewer.tsx` and `preview-area.tsx` compute the same CSS custom property object from the same four user settings. Extract once, consume twice, avoid drift.

### API

```typescript
import type { CSSProperties } from 'react';

/**
 * Convert a 6-digit hex color into an 8-digit hex with alpha, given 0–1 opacity.
 * Defensive: clamps opacity, defaults to 1.
 */
export const addAlpha = (color: string, opacity: number): string => {
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    return `${color}${_opacity.toString(16).padStart(2, '0')}`;
};

/**
 * Build the inline-style CSS custom properties object consumed by
 * `overlayscrollbars` on the host element. Maps Deneb's four user-configurable
 * display settings to the library's three styling variables.
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

**Incidental fix:** the current inline `addAlpha` in `visual-viewer.tsx` is missing `.padStart(2, '0')`. For low opacity values where `_opacity < 16` (≈ 6% or below), the hex conversion produces a single digit (`'5'` instead of `'05'`), yielding an invalid 7-character color string like `#0000005`. The extracted version fixes this as a side-effect of the move. No migration action needed — low-opacity users silently got broken colors before, now they get valid ones.

### Tests

`packages/app-core/src/lib/scrollbars/__tests__/scrollbar-style-vars.test.ts`

- `addAlpha`: `('#000000', 0.2)` → `'#00000033'`
- `addAlpha`: `('#ffffff', 1)` → `'#ffffffff'`
- `addAlpha`: `('#ff0000', 0)` → clamps/defaults (document expected — likely `'#ff0000ff'` given the `|| 1` fallback)
- `addAlpha`: opacity out of range is clamped to 0–1
- `getScrollbarStyleVars`: returns all three CSS vars with correct px/color formats
- `getScrollbarStyleVars`: width and radius are emitted as `${value}px`
- `getScrollbarStyleVars`: opacity is applied to thumb color

---

## 5. What gets deleted

- `packages/app-core/src/lib/scrollbars/overlay-styles.ts` — the `getOverlayScrollbarStyles` factory. Not used anywhere else; the data-table and log-viewer sweep from the 2026-04-08 plan confirmed no other call sites need it. Replaced by `getScrollbarStyleVars`.
- `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts` — corresponding tests.
- `useScrollContainerStyles` Griffel block inside `visual-viewer.tsx` — replaced by the library.
- `shorthands.overflow('overlay')` in `preview-area.tsx`'s `usePreviewStyles.previewArea` — replaced by the library.
- Local `addAlpha` helper at the bottom of `visual-viewer.tsx` — moved to the shared module.
- The two unstaged tests on `patchVegaLiteResponsiveSizing` for `padding: 0` injection — replaced by `autosize` tests.

## 6. What stays untouched (regression guardrails)

The user explicitly confirmed that these places currently look correct and must not change. They all continue to use whatever scrollbar treatment they have today (native, Fluent UI, or their own custom handling):

- Settings pane accordion (Fluent UI scrollable drawer)
- Log viewer scrollbars
- Data table (debug pane) scrollbars
- Monaco editor internal scrollbars (ships with its own scrollbar implementation)
- Any other overflow container in `@deneb-viz/app-core`

No global `::-webkit-scrollbar*` rules, no global scrollbar CSS resets, and no root-level `overlayscrollbars` CSS imports that could affect these components.

**Post-implementation regression check (manual):** walk through each of the listed components, visually confirm scrollbar appearance is unchanged, and inspect DevTools computed styles to verify no `.os-*` class has leaked onto a Fluent UI element.

---

## 7. Scroll event contract

The `denebContainer` Vega signal is fed from the `VisualViewer`'s inner scroll container. Contract and payload shape remain unchanged:

```typescript
{
    scroll: {
        height: viewport.clientHeight,
        width: viewport.clientWidth,
        scrollHeight: viewport.scrollHeight,
        scrollWidth: viewport.scrollWidth,
        scrollTop: throttledScrollPosition.scrollTop,
        scrollLeft: throttledScrollPosition.scrollLeft
    }
}
```

The `viewport` element changes from `containerRef.current` to `osInstance.elements().viewport`. Downstream signal consumers see no difference.

The `preview-area.tsx` outer scroll container does not emit any signal. It exists purely for visual scroll-to-see behavior in the editor.

---

## 8. Dependencies

Added to `packages/app-core/package.json`:

```json
"overlayscrollbars": "^2.10.0",
"overlayscrollbars-react": "^0.5.6"
```

(Exact versions pinned at implementation time based on latest stable 2.x release.)

No peer dependency conflicts with React 19 or Fluent UI v9 expected — the library has no React version constraints beyond 16+.

---

## 9. Testing

### Unit tests

**`patch-vega-lite.test.ts`** (Layer 1, updated)
- `autosize: { type: 'fit', contains: 'padding' }` is injected when the patch injects container sizing
- User-set `autosize` is not overridden
- Specs with explicit dimensions (no container injection) are not given an autosize
- Non-standard layouts (concat/facet) still early-return unchanged

**`scrollbar-style-vars.test.ts`** (new)
- `addAlpha` correctness for the full opacity range
- `addAlpha` hex zero-padding (`0.04` opacity → `'0a'` not `'a'`)
- `getScrollbarStyleVars` returns all three CSS vars with correct formats

**`visual-viewer.test.tsx`** (updated)
- The `OverlayScrollbarsComponent` is rendered when `useScrollbars` is true
- When `useScrollbars` is false, a plain `<div>` with `overflowVisible` is rendered instead
- Firing a `scroll` event on the viewport element updates the `denebContainer` signal via `VegaViewServices.setSignalByName` with the expected payload shape
- Throttling is respected (rapid scroll events produce one signal update per throttle window)
- `VEGA_CONTAINER_ID` is assigned to the viewport element after mount

### Manual test plan

**Layer 1 verification (must pass before moving to Layer 2):**
1. Fitted bar chart on a 364×252 viewport → SVG has `width="364" height="252"`, no scrollbars
2. Spec with `padding: 20` → chart area is `324×212`, SVG still fits 364×252
3. Spec with explicit `width: 800, height: 600` on a 400×300 viewport → SVG overflows, Layer 2 will show scrollbars
4. User `autosize: { type: 'none' }` → Deneb does not override the user setting
5. Edit Vega Spec pane on a fitted chart shows `autosize: { type: 'fit', contains: 'padding' }` in the compiled Vega

**Layer 2 verification:**
6. Fitted spec → no scrollbars visible at all, no gutter reservation, Vega fills all four edges
7. Spec genuinely overflowing → overlay scrollbars appear, sit over content without reserving gutter, chart still reaches non-scroll edges
8. Scrollbars disappear when resizing the Power BI viewport larger than the content
9. `denebContainer.scrollTop` / `scrollLeft` update correctly during scroll (verify via a spec that reads the signal)
10. User changes `scrollbarColor` → scrollbar thumb color updates
11. User changes `scrollbarOpacity` to 0 → scrollbars invisible (intentional opt-out)
12. User changes `scrollbarOpacity` to 100 → scrollbars fully opaque
13. User changes `scrollbarWidth` → scrollbar track width visibly changes
14. User changes `scrollbarRadius` → scrollbar thumb corners visibly change
15. Power BI mobile app — touch scroll works, scrollbars overlay correctly

**Editor (preview-area) verification:**
16. Editor at 100% zoom, preview area ≥ viewport → no scrollbars on preview-area
17. Editor zoomed in so previewWrapper > preview-area → outer overlay scrollbars appear, styled per user settings, no gutter
18. `editorPreferences.previewAreaShowScrollbarsOnOverflow = true` with an overflowing spec → both outer (preview-area) and inner (visual-viewer) scrollbars show, both styled identically

**Regression checks (must still look correct):**
19. Settings pane accordion scrolling — native/Fluent scrollbars unchanged
20. Log viewer scrollbars — unchanged
21. Data table (debug pane) scrollbars — unchanged
22. Monaco editor scrollbars — unchanged

---

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `autosize.contains: 'padding'` turns out not to be the real Layer 1 fix | Medium | Investigation via Edit Vega Spec pane comes *first*. If H1 is disproved, escalate to H2 or H3 fixes as documented. |
| `overlayscrollbars` interferes with Vega canvas click/hover events (interaction pass-through broken) | Medium | Test early on a spec with `params: [{ name: 'sel', select: 'point' }]`. If broken, use the library's `click-scroll` or explicit `pointer-events` configuration. |
| Container ID routing fails post-mount (outside consumers can't find `#deneb-vega-container`) | Low | Verified by unit test; ID assignment is in a `useEffect` with `useScrollbars` dep, cleanup on unmount |
| Bundle size pushes Deneb near the ~1 MB Power BI limit | Low | `npm run webpack:analyze` before and after. Net delta is ~+15 KB (after removing `react-custom-scrollbars-2`, already done). Budget has comfortable headroom. |
| `overlayscrollbars` base CSS leaks and affects Fluent UI scrollable elements | Low | Library's CSS is scoped by `.os-*` class selectors and only applies to elements with those classes. Verified post-implementation via DevTools inspection of each regression-check component. |
| `defer` initialization causes a visible flash on first render | Low | If observed, switch to eager init or use a CSS `opacity: 0` fade-in on the component |
| React 19 compatibility issue with `overlayscrollbars-react` | Low | The library uses standard React patterns (forwardRef, hooks). React 19 is backwards compatible with React 18 component APIs. Verify during implementation. |
| Library's `autoHide: 'never'` plus `visibility: 'auto'` combination behaves differently than documented | Low | Tested in the manual plan (items 6–8). If the combination doesn't work, fall back to `visibility: 'visible'` with manual show/hide via resize observer |

---

## 11. Out of scope

- Any change to the `display.*` capability schema — same five user settings, same names, same defaults, same min/max ranges
- Any change to the `denebContainer` signal contract — same payload shape, same downstream consumers
- Any change to `data-table`, `log-viewer`, settings pane, Monaco editor, or any other overflow container outside `visual-viewer.tsx` and `preview-area.tsx`
- Any fade-on-idle or auto-hide scrollbar behavior (could be a follow-up)
- Firefox-specific styling via `@supports` or similar — `overlayscrollbars` handles all browsers uniformly via its own DOM, so no per-browser branching is needed
- Reintroducing `react-custom-scrollbars-2` under any circumstances
- Reintroducing `VEGA_VIEWPORT_ADJUST` or the `calc(100% - 8px)` workaround
- Server-side rendering — Deneb is client-only

---

## 12. Build order and commit plan

Each phase commits independently so regressions can be isolated via bisect:

1. **Phase 1 — Layer 1 fix.** Investigate 10px overflow via Edit Vega Spec pane, confirm H1, implement the `autosize` injection in `patchVegaLiteResponsiveSizing`, update unit tests, verify manually on a fitted bar chart. Commit: `fix(vega-runtime): inject autosize contains:padding to fit container exactly (#480)`
2. **Phase 2 — shared helper.** Create `scrollbar-style-vars.ts` with `addAlpha` + `getScrollbarStyleVars`, write tests. Commit: `feat(app-core): add getScrollbarStyleVars shared helper`
3. **Phase 3 — Layer 2 visual-viewer.** Add `overlayscrollbars` + React wrapper to `package.json`, swap the scroll container in `visual-viewer.tsx`, wire events and container ID routing, update tests, delete `overlay-styles.ts` factory. Commit: `feat(app-core): replace native scroll container with overlayscrollbars (#480)`
4. **Phase 4 — Layer 2 preview-area.** Swap the preview-area outer scroll container for `OverlayScrollbarsComponent`, subscribe to user settings, merge style vars. Commit: `feat(app-core): apply overlayscrollbars to editor preview area (#480)`
5. **Phase 5 — regression verification.** Walk through the regression check list, commit any fixes discovered. Commit: `test: manual regression verification for overlay scrollbars (#480)` (if needed)

Phase 1 gates everything else — if the investigation shows Layer 1 isn't fixable cleanly, we pause and reconsider before touching the scroll container.
