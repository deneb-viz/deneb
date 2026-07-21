---
title: 'Gate build-time-flagged React components at the JSX call site, not via early-return'
date: 2026-05-06
category: best-practices
module: app-core, root-visual
problem_type: best_practice
component: tooling
severity: medium
applies_when:
    - A React component exists solely to serve a build-time feature flag (debug overlay, dev HUD, instrumentation hook, A/B branch whose flag is resolved at build time by webpack DefinePlugin)
    - The flag is a compile-time constant derived from `process.env.*` inlined by webpack DefinePlugin or an equivalent bundler
    - The component contains hooks (`useState`, `useEffect`, `useContext`, Zustand selectors) that should not run when the flag is off
    - The disabled-branch component is expected to incur zero runtime cost in production builds
tags:
    - react
    - hooks
    - dead-code-elimination
    - webpack
    - define-plugin
    - feature-flags
    - build-time
    - performance
    - call-site-discipline
related_components:
    - development_workflow
---

# Gate build-time-flagged React components at the JSX call site, not via early-return

## Context

During PR review on `fix/editor-transition-bounce-remediations`, a reviewer caught that `<ViewportGateDebugOverlay>` — a diagnostic component controlled by the `PBIVIZ_VIEWPORT_GATE_OVERLAY` build-time env var — was mounted unconditionally in `src/app/app.tsx`. The component used an early-return guard internally:

```tsx
const IS_OVERLAY_ENABLED = toBoolean(process.env.PBIVIZ_VIEWPORT_GATE_OVERLAY);

export const ViewportGateDebugOverlay = () => {
    // hooks run here regardless of IS_OVERLAY_ENABLED ...
    if (!IS_OVERLAY_ENABLED) return null;
    return <div>...</div>;
};
```

The developer had followed the apparently natural pattern — put the guard near the flag definition, inside the component. The reviewer caught that React's hooks contract means the guard only suppresses JSX output, not hook execution. In every production build (flag = false): three Zustand subscriptions, two `useState` slots, a 100ms `setInterval`, and a `window` resize listener were all live for the lifetime of the visual.

## Guidance

**The rule:** Feature-flagged React components — when the flag is a build-time constant (e.g., `process.env.X` inlined by webpack DefinePlugin) — must be gated at the JSX call site, not via early-return inside the component. Export the constant from the feature module; render `{FLAG && <Component />}` in the parent.

**Before — early-return inside the component (wrong):**

```tsx
// src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx

const IS_OVERLAY_ENABLED = toBoolean(process.env.PBIVIZ_VIEWPORT_GATE_OVERLAY);
// NOT exported — only usable inside the component

export const ViewportGateDebugOverlay = () => {
    const mode = useDenebVisualState((s) => s.interface.mode);
    const embedViewport = useDenebVisualState((s) => s.interface.embedViewport);
    const optionsViewport = useDenebVisualState(
        (s) => s.updates.options?.viewport
    );
    const [iw, setIw] = useState(window.innerWidth);
    const [ih, setIh] = useState(window.innerHeight);

    useEffect(() => {
        const tick = () => {
            setIw(window.innerWidth);
            setIh(window.innerHeight);
        };
        tick();
        const id = window.setInterval(tick, 100);
        window.addEventListener('resize', tick);
        return () => {
            window.clearInterval(id);
            window.removeEventListener('resize', tick);
        };
    }, []);

    if (!IS_OVERLAY_ENABLED) return null; // ← guard too late; hooks already ran
    return <div style={overlayStyle}>{lines.join('\n')}</div>;
};
```

```tsx
// src/app/app.tsx — unconditional mount

return (
    <DenebProvider>
        ...
        <ViewportGateDebugOverlay /> {/* ← always mounts */}
    </DenebProvider>
);
```

**After — JSX-level gate at the call site (correct):**

```tsx
// src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx

export const IS_OVERLAY_ENABLED = toBoolean(
    // ← exported
    process.env.PBIVIZ_VIEWPORT_GATE_OVERLAY
);

export const ViewportGateDebugOverlay = () => {
    // hooks only reach here when IS_OVERLAY_ENABLED is true at build time
    const mode = useDenebVisualState((s) => s.interface.mode);
    // ...
    return <div style={overlayStyle}>{lines.join('\n')}</div>;
};
```

```tsx
// src/app/app.tsx — gated mount

import {
    IS_OVERLAY_ENABLED as IS_VIEWPORT_GATE_OVERLAY_ENABLED,
    ViewportGateDebugOverlay
} from '../features/viewport-gate-debug-overlay';

return (
    <DenebProvider>
        ...
        {IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}
    </DenebProvider>
);
```

When `PBIVIZ_VIEWPORT_GATE_OVERLAY=false` at build time, webpack DefinePlugin replaces `process.env.PBIVIZ_VIEWPORT_GATE_OVERLAY` with the string `"false"`, `IS_OVERLAY_ENABLED` evaluates to `false`, the JSX branch is statically unreachable, and dead-code elimination removes the entire overlay subtree (component module, runtime imports, all). Zero hooks. Zero polling. Zero subscription churn.

When the env var is `true`, the component mounts and all hooks run exactly as intended.

## Why This Matters

**React's hooks contract.** Hooks run in declaration order before `return`. An early-return only suppresses JSX output — it does not prevent any hook above it from executing, or any effect it schedules from firing. A `useEffect` will fire on mount regardless of whether the component then returns `null` from render.

**DefinePlugin + dead-code elimination.** When the flag is a build-time constant, a JSX-level gate (`{false && <Component />}`) gives the bundler a statically unreachable branch it can eliminate entirely, including the component's imports and module. An internal early-return gives the bundler no such signal — the component is still invoked, hooks still run, the module is still imported.

**Cumulative runtime cost.** In this case the disabled-but-mounted component armed a 100ms polling interval (`setInterval`) and a `window` resize listener for the entire lifetime of the Power BI visual. Every 100ms `setIw` / `setIh` scheduled re-renders that reconciled against `null`. Three Zustand store subscriptions held live references that participate in every store update. Users who set `PBIVIZ_VIEWPORT_GATE_OVERLAY=false` (the default in all builds) paid this cost invisibly.

## When to Apply

**Apply this pattern when:**

- The component's entire purpose is controlled by a build-time constant (`process.env.*` via DefinePlugin, or a compile-time literal)
- The component contains hooks, effects, subscriptions, intervals, or listeners that should incur zero cost when the flag is off
- The disabled branch is expected to be completely eliminated from the production bundle

**Do not apply when the flag is runtime-resolved.** If the gate value comes from Zustand state, a React prop, a context value, or any value that is not known until the browser runs JavaScript, an early-return inside the component is the correct and only option — there is no static signal for the bundler, and hooks must run in order to read the flag. For example:

```tsx
// Runtime flag — early-return inside is correct here
export const DevPanel = () => {
    const isDevMode = useFeatureFlag('devPanel'); // read from Zustand at runtime
    if (!isDevMode) return null; // ← correct: flag is not known at build time
    return <div>...</div>;
};
```

## Examples

### Concrete case — `ViewportGateDebugOverlay` (commit `794f4273`)

Files changed:

- `src/features/viewport-gate-debug-overlay/components/viewport-gate-debug-overlay.tsx` — exported `IS_OVERLAY_ENABLED`, removed the internal early-return guard
- `src/features/viewport-gate-debug-overlay/index.ts` — re-exported `IS_OVERLAY_ENABLED` from the package index
- `src/app/app.tsx` — imported the exported constant and applied `{IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}` at the call site

Before the fix, every production build (with `PBIVIZ_VIEWPORT_GATE_OVERLAY=false`) carried: 3 Zustand subscriptions, 2 `useState` slots, 1 `setInterval` at 100ms cadence, 1 `window` resize listener. After the fix: all of these are compiled out by dead-code elimination. Zero runtime cost.

### Counter-example — runtime flag (early-return is correct)

```tsx
// IS_DEV_OVERLAY is from Zustand state — not a build-time constant
const IS_DEV_OVERLAY = useDenebVisualState(
    (s) => s.interface.devOverlayEnabled
);
if (!IS_DEV_OVERLAY) return null; // correct: no static signal available
```

Here the JSX-level gate pattern cannot help because `IS_DEV_OVERLAY` is not known until runtime. The early-return inside is the right choice.

## Related

- [docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md](../ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md) — concrete instance: `<ViewportGateDebugOverlay>` is the diagnostic the call-site gate now wraps.
- [docs/solutions/best-practices/render-self-contained-components-bare-2026-04-29.md](render-self-contained-components-bare-2026-04-29.md) — adjacent call-site discipline (don't let components manage decisions callers should own).
- [docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — related: hooks firing at the wrong time due to misplaced ownership.
- [docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md](pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — same React execution-model literacy bucket: React runs things more than you expect.
