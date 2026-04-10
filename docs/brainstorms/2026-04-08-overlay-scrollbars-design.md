# Overlay Scrollbars — Design Spec

## Goal

Fix issue #480: the visual viewer reserves space for `react-custom-scrollbars-2` tracks even when no scrolling is needed, causing the Power BI visual container background to bleed at the edges and preventing Vega from filling the full viewport. Replace the library with native CSS overlay scrollbars across the entire `@deneb-viz/app-core` package and remove the dependency entirely.

## Architecture

Native `overflow: auto` containers styled with CSS overlay scrollbars (webkit pseudo-elements + Firefox `scrollbar-color` / `scrollbar-width`). Scrollbars become visible only when content actually overflows, sit over content rather than reserving gutter space, and require no JavaScript for visibility behaviour. Vega receives the full Power BI viewport dimensions, eliminating background bleed at the edges.

The work is phased so the primary fix lands first, then internal call sites are swept, then the dependency is removed.

## Tech Stack

TypeScript, React 19, Fluent UI v9 (Griffel `makeStyles` + `tokens`), Vega/Vega-Lite, Power BI Visuals API. Browser targets: modern Chromium, Firefox, Safari, mobile (Power BI mobile app).

---

## 1. Phasing

| Phase | Scope | Outcome |
|---|---|---|
| 1 | Replace `<Scrollbars>` in `visual-viewer.tsx` with native overlay container | #480 fixed in the visual viewer |
| 2 | Sweep remaining `<Scrollbars>` call sites (data-table, log-viewer, others) | All in-package usages migrated |
| 3 | Remove `react-custom-scrollbars-2` from `packages/app-core/package.json` and lockfile | Dependency gone |
| 4 *(stretch)* | Remove `VEGA_VIEWPORT_ADJUST` constant and `calc(100% - 8px)` workaround in `vega-embed.tsx` | Cleanup |

Each phase commits independently. Stop conditions are explicit so a stuck sweep site doesn't block the primary fix.

---

## 2. Shared scrollbar styles helper

### Problem

Two distinct styling needs share a common CSS pattern:

- **Visual viewer** — user-configurable via the four `display.*` capability properties (`scrollbarColor`, `scrollbarOpacity`, `scrollbarRadius`, `scrollEventThrottle`)
- **Internal call sites** — theme-aware Fluent UI styling (light theme gets darker thumbs, dark theme gets lighter thumbs)

### Design

Single shared factory: `getOverlayScrollbarStyles({ thumbColor, radius, width })`. Pure function returning a Griffel style object containing both webkit selectors and Firefox properties. Lives in a new `packages/app-core/src/lib/scrollbars/overlay-styles.ts` module so it is reusable across components and unit-testable in isolation.

```typescript
export type OverlayScrollbarOptions = {
    /** rgba string or token reference for the thumb */
    thumbColor: string;
    /** thumb border-radius in px (Firefox ignores) */
    radius: number;
    /** scrollbar track/thumb width in px (Firefox: controls thin/auto hint only) */
    width: number;
};

export const getOverlayScrollbarStyles = (
    options: OverlayScrollbarOptions
) => ({ /* Griffel style object */ });
```

The factory returns CSS equivalent to:

```css
overflow: auto;
/* Firefox — width maps to thin (≤8px) or auto (>8px); exact pixel size is browser-controlled */
scrollbar-width: thin;
scrollbar-color: <thumbColor> transparent;

&::-webkit-scrollbar { width: <width>px; height: <width>px; background: transparent; }
&::-webkit-scrollbar-thumb { background: <thumbColor>; border-radius: <radius>px; }
&::-webkit-scrollbar-thumb:hover { background: <thumbColor>; }
&::-webkit-scrollbar-track { background: transparent; }
&::-webkit-scrollbar-corner { background: transparent; }
```

`overflow: auto` is critical — when content fits, no scrollbar renders at all on Chromium/Safari/Firefox/mobile. This is the overlay-on-demand behaviour required by #480.

---

## 3. Visual viewer (Phase 1)

### Problem

`packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx` wraps the Vega canvas in `<Scrollbars>` from `react-custom-scrollbars-2`. The library reserves 6px tracks even when no scrolling is needed. The current `VEGA_VIEWPORT_ADJUST = 8` constant is a CSS-only workaround that subtracts 8px from the embed root via `calc(100% - 8px)` — explicitly tagged with a `@remarks` reference to #480.

### Design

Replace the `<Scrollbars>` wrapper with a native `<div>` styled by `getOverlayScrollbarStyles`. The five user-configurable `display.*` settings flow into the helper as before:

- `scrollbarColor` + `scrollbarOpacity` → resolved to an `rgba(...)` string for `thumbColor`
- `scrollbarRadius` → `radius`
- `scrollbarWidth` → `width` (new; Firefox renders the closest supported hint — `thin` or `auto`)
- `scrollEventThrottle` → still applied to the throttled `scroll` listener (not a CSS concern)

A throttled native `scroll` event listener attached to `containerRef.current` replaces the `<Scrollbars>` `onScrollFrame` callback. The handler reads `scrollTop`, `scrollLeft`, `scrollHeight`, `scrollWidth`, `clientHeight`, `clientWidth` from the element and feeds the existing `setScrollFrame` action with the same payload shape so downstream `denebContainer` signal updates are unaffected.

`compileSpec` continues to receive the full Power BI viewport via `containerDimensions`. The fix is that the rendered canvas now actually occupies that space.

### Key changes

- `visual-viewer.tsx` — drop `import { Scrollbars }`, replace the `useScrollbars`/`Scrollbars` branch with a native `<div ref={containerRef} className={scrollClass}>{vegaComponent}</div>` and a throttled `scroll` listener registered via `useEffect`
- New: `packages/app-core/src/lib/scrollbars/overlay-styles.ts` — the shared factory
- New: `packages/app-core/src/components/visual-viewer/styles/scroll-container.ts` — uses the factory with the four user settings
- `vega-embed.tsx` — `VEGA_VIEWPORT_ADJUST` and `calc(100% - 8px)` left in place during Phase 1; revisited in Phase 4

### Editor preview

`preview-area.tsx` already uses CSS scaling without `<Scrollbars>`. Untouched.

---

## 4. Internal call site sweep (Phase 2)

### Problem

`react-custom-scrollbars-2` is also used in:

- `packages/app-core/src/features/debug-area/components/data-table/data-table.tsx`
- `packages/app-core/src/features/debug-area/components/log-viewer/log-viewer.tsx`
- (Phase 2 begins with an Explore pass to surface any others not currently catalogued)

These wrap text-heavy editor UI, not the rendered visual. They do not need user-configurable colour/opacity/radius — they need to look correct in both light and dark Fluent themes.

### Design

Each call site is replaced by a native overflow container styled by the same `getOverlayScrollbarStyles` factory, but with theme-aware values pulled from Fluent UI tokens:

```typescript
import { tokens } from '@fluentui/react-components';

const scrollClass = makeStyles({
    root: getOverlayScrollbarStyles({
        thumbColor: tokens.colorNeutralForeground3,
        radius: 4,
        width: 8
    })
})();
```

Fluent's token system already swaps `colorNeutralForeground3` between light and dark themes via the active `FluentProvider`. No additional theme detection logic required. If `tokens.colorNeutralForeground3` proves too dark in the dark theme, fall back to `colorNeutralStroke1` or `colorNeutralBackground5` — the choice is a one-line tweak per site.

Where a `<Scrollbars>` is used purely for layout (not for styled scrollbars), a plain `<div className={overflowAuto}>` is sufficient.

### Site-by-site notes

- **data-table** — Vertical and horizontal overflow possible. Apply the helper to the table's outer wrapper.
- **log-viewer** — Vertical only. Same treatment.
- **Any other site found in Phase 2 Explore pass** — Default to the helper unless a site is layout-only.

---

## 5. Dependency removal (Phase 3)

After Phase 2 lands, run a final grep for `react-custom-scrollbars-2` and `Scrollbars` (case-sensitive, narrowed by import path). If clean:

- Remove `react-custom-scrollbars-2` from `packages/app-core/package.json` `dependencies`
- Run `npm install` to update `package-lock.json`
- Verify the package builds, all tests pass, dev server runs, and the visual loads

If any import remains, that site is added to Phase 2 and Phase 3 is deferred.

---

## 6. `VEGA_VIEWPORT_ADJUST` cleanup (Phase 4, stretch)

After Phases 1–3 ship and the visual is verified to render to the edges of the Power BI container in both fitted and overflowing scenarios:

- Remove `VEGA_VIEWPORT_ADJUST` from `packages/app-core/src/components/visual-viewer/constants.ts`
- Remove `calc(100% - 8px)` from `vega-embed.tsx`
- Verify no edge bleed reappears
- If any site still depends on the constant, leave it and document why

Stretch because the constant predates this work and may be absorbing other rounding errors. Worth the cleanup attempt but not blocking.

---

## 7. Throttled scroll listener

`scrollEventThrottle` (a `display` capability property) currently throttles `<Scrollbars>` `onScrollFrame`. After migration:

```typescript
useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = throttle((e: Event) => {
        const t = e.target as HTMLDivElement;
        setScrollFrame({
            scrollTop: t.scrollTop,
            scrollLeft: t.scrollLeft,
            scrollHeight: t.scrollHeight,
            scrollWidth: t.scrollWidth,
            clientHeight: t.clientHeight,
            clientWidth: t.clientWidth
        });
    }, scrollEventThrottle);
    el.addEventListener('scroll', handler, { passive: true });
    return () => {
        el.removeEventListener('scroll', handler);
        handler.cancel?.();
    };
}, [scrollEventThrottle]);
```

`{ passive: true }` is important — it tells the browser the handler will not call `preventDefault`, allowing scroll compositing to stay on the GPU thread (mobile-critical).

### Throttle implementation

`@uidotdev/usehooks` is already installed in the project. Check whether it exports a standalone `throttle` function suitable for event listener use (i.e., not a React hook). If it does, import from there.

If `@uidotdev/usehooks` does not provide a non-hook throttle, implement a minimal one inline in `overlay-styles.ts` or a co-located `throttle.ts` utility — approximately 10 lines. **Lodash must not be re-added under any circumstances.** It was deliberately removed from the codebase; importing `lodash`, `lodash-es`, or any lodash sub-package is prohibited.

---

## 8. Browser support matrix

| Feature | Chromium | Firefox | Safari | Mobile |
|---|---|---|---|---|
| `overflow: auto` (overlay-on-demand) | ✅ | ✅ | ✅ | ✅ |
| `::-webkit-scrollbar*` selectors | ✅ | ❌ | ✅ | ✅ |
| `scrollbar-color` / `scrollbar-width` | ✅ (newer) | ✅ | ✅ (newer) | ✅ (newer) |
| `border-radius` on thumb | ✅ | ❌ (square thumbs) | ✅ | ✅ |
| Exact pixel `scrollbarWidth` | ✅ | ❌ (`thin`/`auto` hint only) | ✅ | ✅ |
| Native `scroll` event throttling | ✅ | ✅ | ✅ | ✅ |

Square thumbs and imprecise width in Firefox are accepted as degraded but functional outcomes.

---

## 9. Testing

### Unit tests

- `packages/app-core/src/lib/scrollbars/__tests__/overlay-styles.test.ts`
  - Default values produce expected CSS
  - Each option (`thumbColor`, `radius`, `width`) is reflected in the output
  - Firefox properties (`scrollbar-color`, `scrollbar-width`) are present
  - Webkit pseudo-element selectors are present
  - rgba thumb colors are accepted as-is (no transformation)

- `packages/app-core/src/components/visual-viewer/__tests__/visual-viewer.test.tsx`
  - The new container fires `setScrollFrame` with the correct payload shape on `scroll` events
  - Throttling is respected (rapid events fire only once within the throttle window)
  - The container has `overflow: auto` and the scroll class applied
  - No `<Scrollbars>` element exists in the rendered tree

### Manual test plan

1. Default settings, fitted spec → no scrollbars visible, Vega canvas reaches all four edges of the Power BI container
2. Spec with `autosize: { type: "none" }` and oversized hardcoded width/height → scrollbars appear, sit over content (no gutter reservation), Vega still reaches non-scroll edges
3. Resize Power BI viewport smaller than spec → scrollbars appear; resize larger → disappear without layout jank
4. `denebContainer.scrollTop` / `scrollLeft` signal updates correctly when scrolling
5. Light theme → internal scrollbar thumbs are dark and visible
6. Dark theme → internal scrollbar thumbs are light and visible
7. Firefox → square thumbs but otherwise functional
8. Power BI mobile app → no fixed scrollbars eating space, touch scroll works
9. User changes `display.scrollbarColor` to a new value → visual viewer scrollbar updates
10. User sets `display.scrollbarOpacity` to 0 → visual viewer scrollbars become invisible (intentional opt-out)
11. User changes `display.scrollbarWidth` → Chromium/Safari scrollbar track resizes; Firefox shows no change (expected)

---

## 10. Out of scope

- Capability schema changes — the four `display.*` properties stay as they are
- Changes to `denebContainer` signal contract — same payload, same downstream consumers
- Editor preview rendering path (`preview-area.tsx`) — already scrollbar-free
- `react-custom-scrollbars-2` usage outside `@deneb-viz/app-core` (none currently known)
- Server-side rendering concerns — Deneb is a client-only Power BI visual

---

## 11. Risks

- **Mobile rendering** — `::-webkit-scrollbar` is supported on iOS Safari and Android Chrome, but always-overlay behaviour is the platform default and mostly hides scrollbars regardless. Manual test on the Power BI mobile app required.
- **Throttle library** — `@uidotdev/usehooks` is already installed; confirm it exports a non-hook `throttle` usable in event listeners. If not, write a minimal inline implementation. Lodash must not be re-added (see §7).
- **Fluent token darkness** — `colorNeutralForeground3` may not be the right token for either theme. The fix is a one-line per-site swap, but worth verifying empirically on Phase 2 manual passes.
