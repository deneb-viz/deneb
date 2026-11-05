---
title: 'Sharing UI, strings and wiring between both visuals through powerbi-host'
date: 2026-11-06
category: architecture-patterns
module: powerbi-host
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
    - 'Deneb and the viewer-only build need the same component, hook, string or host wiring'
    - 'A shared piece needs a small addition that only one visual makes'
    - 'A shared value must not end up in the bundle of the visual that does not use it'
    - 'A refactor moves code from an app into powerbi-host and must not change either visual'
related_components:
    - development_workflow
tags:
    [
        powerbi-host,
        entry-contract,
        render-props,
        platform-provider,
        tree-shaking,
        side-effects,
        i18n,
        package-parity
    ]
---

# Sharing UI, strings and wiring between both visuals through powerbi-host

## Context

Deneb (`apps/deneb`) and the viewer-only build of Deneb (`apps/viewer`) share one host layer, `@deneb-viz/powerbi-host`. Both need the same kernel lifecycle, platform provider, status pieces, toaster, dev overlays and strings. They differ in what they add: Deneb has the editor, its settings pane and the apply-changes toast; the viewer-only build has its import surface and landing steps. The question each time is where a piece lives, and how one visual adds to it without changing the other.

## Guidance

**1. Reach the package only through its entry.** `powerbi-host` exports only `.`, and `src/index.ts` is its whole public surface. `apps/deneb/src/__test__/invariants/host-barrel-boundary.test.ts` rejects deep `@deneb-viz/powerbi-host/...` imports and relative imports that leave the app. A shared value is therefore exported, never imported by path:

```ts
// packages/powerbi-host/src/index.ts
export { SETTINGS_PANE_TRANSLATIONS } from './i18n/settings-pane';

// apps/deneb/src/i18n/index.ts
import { SETTINGS_PANE_TRANSLATIONS } from '@deneb-viz/powerbi-host';
export const I18N_TRANSLATIONS: Translations = {
    'en-US': { ...SETTINGS_PANE_TRANSLATIONS['en-US'], ...en_US }
};
```

**2. Let a visual add its own parts in one of three ways.**

- A render prop. The shared toaster shows the toasts every visual has; Deneb adds its apply-changes toast, and the viewer-only build passes nothing:

    ```tsx
    <NotificationToaster
        notifications={(toasterId) => (
            <NotificationApplyChanges toasterId={toasterId} />
        )}
    />
    ```

- A shared memoized value spread into the visual's own memo. `usePlatformProvider(props)` returns the Power BI platform provider, memoized. Deneb spreads it into a memo that depends on it, so the result stays as stable as before:

    ```tsx
    const basePlatformProvider = usePlatformProvider(props);
    const platformProvider = useMemo(
        () => ({
            ...basePlatformProvider,
            isDownloadPermitted
            // the settings pane, cross-highlight and download entries
        }),
        [basePlatformProvider, host, isDownloadPermitted]
    );
    ```

    The viewer-only build passes `usePlatformProvider(props)` to `DenebProvider` as it is.

- An optional prop only one visual passes, such as the landing page's step marking, heading-row action and inset. Without the prop, the other visual's markup must not change: see [Griffel mergeClasses rewrites the class string](../ui-bugs/griffel-mergeclasses-rewrites-plain-class-string-2026-11-06.md).

**3. Put composition across features in `app/`.** powerbi-host's layers are `app → features → components → lib → state → i18n`, enforced by `eslint-plugin-boundaries` through `packages/eslint-config/boundaries.js`, and features can't import each other. `DevOverlays` combines the two overlay features, so it lives in `src/app/dev-overlays.tsx`. `usePlatformProvider` and `useRenderingSettle` sit beside it because they compose lib and state.

**4. Put each kind of string where its consumer can reach it.**

- Strings both visuals show at runtime go in the kernel's `src/i18n/en-US.ts`. The kernel merges its strings first and the visual's after, so a visual can override one, and `translation-keys-disjoint.test.ts` keeps the catalogs from sharing keys.
- JSON that TypeScript imports must sit under `src/`: tsc (with `resolveJsonModule`) emits an imported JSON file into `dist` only when it is under the package's root dir.
- `"sideEffects": false` in powerbi-host's `package.json` lets a visual that never imports a shared value drop it. The viewer-only build's packaged JS contains none of the settings pane strings, which a search of the package for one of their keys confirms.
- Format pane strings reach Power BI through the webpack plugin, not through imports: see [The Power BI webpack plugin replaces string resource files that share a locale](../build-errors/powerbi-plugin-replaces-same-locale-string-resources-2026-11-06.md).
- Strings the editor shows stay in app-core, because `apps/web-client-sample` uses the editor too.

**5. Keep a piece in its app when only one visual needs it.** Move code into powerbi-host when both use it, not in case the other might.

## Why This Matters

- A fix to cross-filtering, tooltips, the rendering lifecycle or a shared string lands once, instead of in one visual and not the other.
- Render props, spreads and optional props let each visual add what it needs while the other's output stays the same.
- The single entry and the layer rules stop the package turning into a set of reach-in imports.
- `sideEffects: false` means a shared value costs nothing in the visual that doesn't use it.

## When to Apply

- Both visuals have, or are about to have, the same code.
- A piece differs between them only by an addition: use a render prop, a spread or an optional prop.
- Not when one visual needs a piece and the other would only carry it as dead code.

## Examples

Both apps compose the same pieces. The viewer-only build's `App`:

```tsx
useRenderingSettle(surface, closesRenderingSynchronously(surface), props);
const platformProvider = usePlatformProvider(props);
return (
    <DenebProvider platformProvider={platformProvider}>
        {/* the viewer and the visual's own surfaces */}
        <NotificationToaster />
        <DevOverlays />
    </DenebProvider>
);
```

`useRenderingSettle(surface, isRenderless, props)` closes the rendering lifecycle for updates that never reach Vega: synchronously on a renderless surface, otherwise through a settle timer that defers while a render is in flight. Each app decides which of its surfaces are renderless; the timing logic is shared.

To check that a share-out refactor changes nothing:

1. Run `npm run ci:local`.
2. Package both visuals and compare each with a package built before the change:

    ```bash
    npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>
    ```

    Expect only `content.js` to differ, for each visual.

3. Search the packaged JS for a string or identifier to see where shared code ended up. Don't rely on the bundle analyzer's per-module sizes.
4. Where a test would need the live Power BI host, read the source by path instead. `packages/powerbi-host/src/app/__test__/use-platform-provider.test.ts` checks the provider is memoized on exactly the values it closes over, and `dev-overlays.test.ts` beside it checks each overlay is gated where it mounts.

## Related

- [The Power BI webpack plugin replaces string resource files that share a locale](../build-errors/powerbi-plugin-replaces-same-locale-string-resources-2026-11-06.md)
- [Griffel mergeClasses rewrites the class string even with nothing to merge](../ui-bugs/griffel-mergeclasses-rewrites-plain-class-string-2026-11-06.md)
- [Extract shared semantics to avoid dual maintenance](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md): the same principle at the level of a function.
- [Gate feature-flagged React components at the call site](../best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md): the pattern `DevOverlays` follows.
- [Rendering lifecycle coordinator](./rendering-lifecycle-coordinator-single-owner-2026-07-03.md): what `useRenderingSettle`'s settle close feeds.
- `packages/app-core/ARCHITECTURE.md`: the layer model app-core and the editor follow.
