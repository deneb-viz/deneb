# @deneb-viz/powerbi-host

The Power BI host layer for Deneb visuals. It is consumed by `apps/deneb`, which composes the editor on top of it.

## Contents

- **Kernel** - `VisualKernel`, the `IVisual` lifecycle base class (`src/app/visual-kernel.ts`), configured through `VisualKernelConfig` (visual name and version, app component, slice synchronization). A visual extends it as a thin entry class.
- **Visual store** - the Zustand store (`useDenebVisualState`) with dataset, host, interactivity, interface, settings and updates slices.
- **Host libraries** - interactivity (selection, cross-filter, context menu, tooltips), persistence, dataset mapping, the Power BI-aware Vega loader, export permission and the rendering lifecycle.
- **Status pieces** - the generic components status pages compose (splash, progress, fetching message, container).
- **Dev overlays** - the viewport-gate and visual-update-history debug overlays.

## Entry contract

`src/index.ts` is the only entry, exposed as the `.` export. Consumers import the bare specifier `@deneb-viz/powerbi-host`; deep paths are not exported and are rejected by a canary in the visual. Nothing inside the package imports its own entry.

The kernel renders into `#deneb-application-wrapper`, whose sizing lives in the visual's stylesheet.

The kernel persists properties under the `vega`, `developer`, `stateManagement`, `dataLimit` and `display` objects, which the visual's `capabilities.json` must declare.

## Layering and direction

The package uses the same layer model as `@deneb-viz/app-core` and `@deneb-viz/editor`, with the layers `app`, `feature`, `components`, `lib`, `state` and `i18n`. Dependencies point downward only; see [app-core ARCHITECTURE](../app-core/ARCHITECTURE.md) for the matrix. `src/__tests__/architecture-boundaries.test.ts` fails on any violation.

The package depends on `@deneb-viz/app-core` and never on `@deneb-viz/editor`. The visual composes the editor on top of the kernel. The dependency-direction canary in `apps/deneb` and `src/__tests__/kernel-is-editor-free.test.ts` enforce this.

## Build and test

The package is compiled with `tsc` (not `tsdown`) so that const enums from `powerbi-visuals-api` are inlined at compile time, leaving no runtime dependency on the API package.

`@deneb-viz/powerbi-compat` is a peer dependency and is never bundled; the visual supplies the single runtime instance. By contrast, `@deneb-viz/powerbi-host` is an ordinary devDependency of the visual. It holds no runtime state that has to be shared with other packages, so it is not a peer singleton.

```bash
npm run build -w @deneb-viz/powerbi-host
npm run test -w @deneb-viz/powerbi-host
npm run eslint -w @deneb-viz/powerbi-host
```
