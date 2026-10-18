---
title: 'refactor: extract the Power BI host kernel into packages/powerbi-host'
type: refactor
status: active
date: 2026-09-17
origin: docs/brainstorms/2026-09-17-powerbi-host-package-extraction-requirements.md
deepened: 2026-09-17
---

# refactor: extract the Power BI host kernel into packages/powerbi-host

## Summary

The visual's `IVisual` lifecycle becomes a base class in a new tsc-built package, and the visual's entry shrinks to a subclass that passes a small config: its settings model class, its App component, its translation extension, its feature flags and its own sync contributions. PR 1 draws every seam inside `apps/deneb` behind a transitional host barrel; PR 2 is the mechanical move that turns the barrel into the package entry and flips import specifiers, reusing the editor extraction's tooling and canary patterns.

---

## Problem Frame

The Power BI host integration lives entirely inside `apps/deneb/src` (158 files, roughly 22,800 lines), mixed with the parts that are specific to this visual, and sits outside the layered-boundaries lint and canaries that protect app-core and the editor (see origin: `docs/brainstorms/2026-09-17-powerbi-host-package-extraction-requirements.md`). Research on 2026-09-17 confirmed the concrete coupling that keeps it there: the entry file mixes lifecycle and composition; nine host libraries import the visual store by relative path; drilldown imports the app's feature flags by relative path; the settings model bundles the editor card; the sync initialiser hard-wires the editor-preferences mapping; and the dev overlay shell imports a clipboard helper from the editor package.

---

## Requirements

Carried from origin; R-IDs and group headers are origin's.

**Package shape**

- R1. The new package owns the kernel: lifecycle, the six store slices, host services, interactivity, dataset mapping, persistence core with generic settings cards, rendering lifecycle, Vega embed helpers, state sync, display mode, keyboard focus, application constants, generic status pieces, dev overlays.
- R2. `apps/deneb` keeps a thin entry, App composition, settings-pane contributions, apply-changes notification, editor settings card, editor-preferences sync, landing page, capabilities, manifest, locale JSON, feature flags, config.
- R3. One-way dependency: the host package never imports the editor package; the dev overlay's clipboard import gets a non-editor home.
- R4. Regular dependency of the visual, built to `dist/`, bundled by webpack, not externalised, not a singleton peer.

**Seams between kernel and app**

- R5. App-side code reaches the store only through the package's public entry.
- R6. Feature flags are supplied at kernel construction; the kernel never imports app config.
- R7. Generic settings cards (general, display, vega, data limit, state management, developer), defaults and the formatting service live in the package; the app composes its model and hands it to the kernel; kernel persistence code is agnostic to app-contributed cards.
- R8. The app supplies its App composition to the kernel, and that composition owns the display-mode switch: when display mode resolves to landing it renders the app's own landing page, and in every other mode it renders the kernel's generic status pieces or the viewer and editor as today. The landing page is app-side; the generic status pieces are kernel-owned.
- R9. Display-mode machinery moves whole.
- R10. The entry is composition only.

**Build and tooling**

- R11. tsc build with const-enum inlining.
- R12. Turbo orders the package after app-core and before the visual.
- R13. Layered-boundaries lint and vitest canary adopted.
- R14. Power BI ESLint plugin gate covers the package.
- R15. Workspace-enumerating tooling covers the package.

**Behaviour preservation and proof**

- R16. No user-visible behaviour, capability, setting or persisted-property change.
- R17. Parity strict-PASS on every non-content part; `content.js` differs by design; tests, size bound and Desktop smoke cover it.
- R18. `visual.js` within 1% of baseline, byte-probed.
- R19. Direction canary over the package manifest and sources.
- R20. Editor-free reachability canary from the package entry.
- R21. Host-layer tests move with their subjects; ESLint, Prettier and `ci:local` pass.
- R22. Dev overlays move and stay inert unless the app's dev toggles enable them.

**Origin acceptance examples:** AE1 (R3, R19), AE2 (R6), AE3 (R7), AE4 (R8, R9), AE5 (R10), AE6 (R16–R18), AE7 (R20).

---

## Scope Boundaries

- No second visual, capabilities set, GUID or branding.
- No shared capabilities or webpack tooling between apps.
- No viewer-only landing page or workflow; only the seam.
- The visual store and the app-core store stay separate.
- No fold into `@deneb-viz/powerbi-compat`; no change to its surface; overlap between moved interactivity/formatting code and its subpaths is left as-is.
- No bundle slimming beyond what falls out of the cut.
- `apps/web-client-sample` untouched.
- No tests added for the editor settings card itself (existing gap); only the new sync-contribution seam is tested.

### Deferred to Follow-Up Work

- Extracting the App composition's display-mode switch (`initializing` / `fetching` / `landing` / `no-project` / `viewer` / `editor`) into a shared component: wait until a second App composition exists.
- `PBIVIZ_VIEWPORT_GATE_OVERLAY` and `PBIVIZ_DEV_FORCE_READ_MODE` are read via `process.env` but absent from `turbo.json` `globalEnv`: pre-existing gap, separate housekeeping change.
- Capturing the tsc-versus-tsdown package decision and the parity-tool workflow as `docs/solutions/` entries after PR 2 lands.
- Any `apps/deneb/pbiviz.json` version bump (a 2.1.0.0 bump was present in the working tree earlier on 2026-09-17 and has since been reverted) is committed on its own and never sits in a parity candidate whose baseline carries the previous version.

---

## Context & Research

### Relevant Code and Patterns

- `apps/deneb/src/index.ts` (1,011 lines): the `Deneb` class; only `installEditorState()` is editor-specific. Constructor binds `VisualHostServices`, persist host, `InteractivityManager`, locale (with the app's translation extension), `VegaExtensibilityServices`, the formatting service, store synchronisation, then mounts `<App>` with the host and four rendering-lifecycle adapters.
- `apps/deneb/src/app/app.tsx`: `AppProps` = host plus `onRenderingStarted` / `onRenderingFinished` / `onSettleClose` / `onRenderingError`; the display-mode switch and platform-provider construction live here; `report-view-router.tsx` is a thin viewer mount.
- `apps/deneb/src/lib/persistence/model/`: `VisualFormattingSettingsModel extends formattingSettings.Model` with card fields `general`, `editor`, `dataLimit`, `display`, `vega`, `stateManagement`, `developer`; `cards` lists all but `general`; `resolveDeveloperSettings` hides three cards outside developer mode; `DEFAULTS` is keyed by card and carries `editor.maxLineLength`; the service populates the model by class.
- `apps/deneb/src/lib/state/sync.ts`: `initializeStoreSynchronization` creates four slice syncs (project, editorPreferences, visualRender, compilation) via `createSliceSync`; the editor-preferences mapping is the only app-specific one (eleven properties against capabilities object `editor`).
- `apps/deneb/src/lib/dataset/drilldown.ts`: `isDrilldownFeatureEnabled` reads `FEATURES` from `apps/deneb/config`.
- App-side files importing kernel modules by relative path today: `app/app.tsx`, `features/settings/components/{cross-filter-max-data-points,cross-filter-mode-settings,interactivity-settings,interactivity-toggle}.tsx`, `features/settings/helpers.ts`, `features/toaster/components/notification-cross-filter-exceeded.tsx`, and the entry.
- Editor-package imports in `apps/deneb/src`: the entry (`installEditorState`), `app.tsx` (`markEditorOpenStart`, `RetainedDenebEditor`), five settings-pane files, the apply-changes notification, and `features/dev-overlay-shell/components/dev-overlay-shell.tsx` (`copyToClipboard`, whose source is `packages/editor/src/lib/clipboard.ts`; no equivalent in utils or app-core).
- `process.env` reads that move with the kernel: `state/state.ts` (devtools), `lib/vega-embed/loader.ts` (external URI), `lib/state/display-mode.ts` (forced read mode), the two overlay components, and the entry's dev-mode and overlay toggles. `packages/app-core/src/state/state.ts` already reads `process.env.ZUSTAND_DEV_TOOLS` from package dist and the visual's `DefinePlugin` (`apps/deneb/webpack.common.config.js`) replaces it at bundle time, so verbatim reads survive the move.
- Const enums used: `VisualUpdateType`, `ViewMode`, `EditMode`, `PrivilegeStatus`, `VisualDataChangeOperationKind`, declared `const enum` in `powerbi-visuals-api/src/visuals-api.d.ts`. `packages/powerbi-compat/tsconfig.json` extends the base config and sets `isolatedModules: false` and `preserveConstEnums: false` for inlining.
- `packages/editor/package.json`: the peer/dependency split to mirror (app-core, powerbi-compat, vega-react, vega-runtime, Fluent, React, `powerbi-visuals-api`, formattingutils, vega, vega-lite as peers). `packages/editor/turbo.json` pins `@deneb-viz/app-core#build`. `packages/editor/vitest.config.ts` pre-bundles `powerbi-visuals-utils-formattingutils` via an esbuild alias.
- Canary templates: `apps/deneb/src/__test__/invariants/package-dependency-direction.test.ts` (manifest plus flat text scan, pure detection function), `packages/app-core/src/__tests__/_reachability-walk.ts` and `viewer-entry-is-editor-free.test.ts` (TypeScript-AST value-edge walk), `packages/editor/src/__tests__/architecture-boundaries.test.ts` (ESLint Node API, zero `boundaries/element-types`), `package-singleton-contract.test.ts` (peer-only check applies to every consumer; the `neverBundle` check applies only where a `tsdown.config.ts` exists, so a tsc package passes with peer-only), `certification-and-build-invariants.test.ts` (asserts the safety-net bound in the entry is at most 10 s).
- `packages/eslint-config/boundaries.js`: `createBoundariesConfig({ entry, layers })`; layers `app`, `feature`, `components`, `lib`, `state`, `context`, `i18n`, `catalog`; `app` may import every lower layer; `lib` may not import `feature`.
- Test harness: `apps/deneb/src/__test__/harness/` (`fake-visual-host.ts`, `fixtures.ts`, `mock-dataset-slice.ts`, `update-cycle-driver.ts`, `scenarios.test.ts`, `display-mode-quirks.test.ts`) imports only `src/lib/*`, never the entry or `src/app`.
- The pbiviz webpack plugin generates `.tmp/precompile/visualPlugin.ts` from `visualClassName` (`Deneb`) resolved against `apps/deneb/src`; a named `Deneb` export must remain there.
- Prior mechanics: `docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md` (transitional entry in PR 1, specifier flip in PR 2, import rewriter, move manifest, per-PR parity gate).

### Institutional Learnings

- `docs/solutions/architecture-patterns/rendering-lifecycle-coordinator-single-owner-2026-07-03.md`: the coordinator is single-writer with dependency-injected overlay observability; the move must not introduce a second writer or split the DI wiring from its consumer. The 10 s safety-net bound is a certification ceiling, not a tunable.
- `docs/solutions/test-failures/vitest-windows-externalizes-powerbi-utils-esm-2026-07-20.md`: pre-bundle the Power BI utils in the new package's vitest config from day one.
- `docs/solutions/design-patterns/module-init-helpers-must-be-leaf-modules-2026-07-13.md`: kernel-internal modules must never import the package barrel; a module-init helper round-tripping through the barrel causes a circular-init TDZ.
- `docs/solutions/best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md`: run the full type-checked package build, not only vitest, before trusting green; relevant because the package's const-enum inlining is only exercised by tsc.
- `docs/solutions/build-errors/webpack-persistent-cache-ghost-export-warnings-2026-05-27.md`: expect stale-cache ghost warnings after the move; `npm run dev` clears `.tmp/`.
- `docs/solutions/workflow-issues/cross-pr-holistic-review-and-remediation-pipeline-2026-07-16.md`: run one holistic review across both PRs before PR 2 merges.

### External References

- `powerbi-visuals-utils-formattingmodel` (installed copy, `lib/FormattingSettingsService.js`): `populateFormattingSettingsModel` instantiates the class it is given and reads `cards`; `buildFormattingModel` iterates `cards` in array order. This is what makes composition by subclassing and the card-order seam sound.
- No other external reference needed; every other pattern has a local precedent.

---

## Key Technical Decisions

- **Two PRs, seams before moves.** PR 1 (`chore/757-host-seams`) changes logic inside `apps/deneb`; PR 2 (`chore/757-powerbi-host`) is a mechanical move. PR 2's baseline is PR 1's merge commit.
- **Kernel seam is a base class with a config object.** The package exports an `IVisual`-implementing base class whose constructor takes the host options plus a kernel config. The visual's entry exports `class Deneb extends` that base and passes its config; the named export stays in `apps/deneb/src` because the pbiviz plugin locates it by name there. A factory returning a class was rejected: it adds indirection for the same surface and hides the `IVisual` shape from the entry.
- **Config contents.** Settings model class; App component typed against a package-exported props type (today's `AppProps`); the app's translation extension; feature flags; app-contributed sync slice definitions; an optional state-install hook. Nothing else: dev toggles are env reads, host services are bound by the kernel.
- **Editor state install is a config hook, run first inside the kernel constructor's try block.** Today the install runs inside the constructor's try, so a throw degrades to the sanctioned construction-failure text. A module-scope call in the entry would run outside any containment and could abort module evaluation before the pbiviz plugin registers the class, so it was rejected. A viewer-only entry omits the hook.
- **No landing-page injection.** The display-mode switch is in the app's App composition and stays there; `SplashInitial`, `FetchingMessage`, `Progress`, `StatusContainer`, `StatusStackItem` and the shared status style hook move to the package; the four landing-page components stay app-side and import those pieces from the package (R8, AE4 hold structurally).
- **Settings model composition by subclassing, with the card order kept by a base-class seam.** The package exports a base model with the generic cards, `resolveDeveloperSettings`, generic `DEFAULTS`, and the service, which populates whatever model class the config names (`populateFormattingSettingsModel` instantiates the class it is given and reads `cards` in array order, so field-initializer overriding works). Today's order is editor, display, dataLimit, stateManagement, vega, developer: the editor card is first. The base therefore exposes its generic card list, and the visual's subclass composes `cards` as its editor card followed by that list, rather than hand-duplicating the base's fields. `editor.maxLineLength` moves out of generic defaults into the app-side model module.
- **Kernel types against the base model; the app narrows with one assertion.** The store's settings slice, the sync mapping types, the project and display-mode mappings, migration and data-view helpers are retyped against the base. The app reads its editor card through one accessor that asserts the base model to the visual's class. This is a type assertion, not a narrowing: it is sound only because the app is the sole binder of its own model class into the kernel, and the accessor's docblock states that invariant. The alternative, a type parameter for the settings model threaded through the store, the slice, every sync mapping type and the kernel class, was rejected as surface paid by every consumer for one narrowing.
- **Sync contributions are config.** `initializeStoreSynchronization` takes an array of app-contributed slice sync definitions and registers them after the generic ones with the same teardown. The editor-preferences mapping moves to the app and is passed in.
- **Feature flags travel as a parameter.** The kernel holds the config's flags and threads them into dataset processing; `isDrilldownFeatureEnabled` takes flags instead of importing config.
- **Clipboard helper moves to utils** as a `clipboard` subpath; the editor's `lib/clipboard.ts` and its re-export are removed; export-buttons and the dev overlay import from utils.
- **Download-permission resolution moves** into the kernel's host library; it is Power BI privilege plumbing with a const enum, not visual-specific composition.
- **Kernel strings get their own translation extension, authored as a TypeScript module.** The kernel registers its own extension and appends the app's; the key split of `apps/deneb/src/i18n/en-US.json` by consumer happens at implementation time. The kernel's strings are a `.ts` object rather than JSON because no tsc-built package in the repo imports JSON, so whether tsc copies a JSON asset into `dist` for webpack to resolve is unproven; a TypeScript module has no such question. The app keeps its JSON, which webpack handles today.
- **Overlay enable flags are exported under distinct names.** Both dev-overlay features export a same-named `IS_OVERLAY_ENABLED`; the package entry re-exports each under a feature-specific name so the barrel has no collision.
- **Transitional host barrel in PR 1.** `apps/deneb/src/host.ts` is the package's future entry: it exports exactly what app-side code needs, app-side files import from it, kernel-internal files never do. PR 2 moves the file to the package entry and flips `'../host'` to `'@deneb-viz/powerbi-host'`.
- **Kernel folder is an `app` layer.** The base class mounts React and reaches into features (overlays), libs and state, so it is `src/app/` in the package's layer model; in PR 1 it lives at `apps/deneb/src/kernel/` to avoid colliding with the visual's own `src/app/`.
- **The dev-overlay shell becomes a `components` layer.** Both overlay features import `DevOverlayShell` and `CollapsibleSection` from the sibling `dev-overlay-shell` feature, and the shared boundaries matrix forbids feature-to-feature imports. The package declares a `components` layer and the shell and collapsible section live there; the two overlay features import from it. Merging the three overlay features into one was rejected because they are independently env-gated.
- **tsc build.** Package tsconfig follows `packages/vega-react` (tsc build over the `react-library` base config, a `.tsx` source emitted to `dist`, consumed from workspace dist today) and adds `powerbi-compat`'s two const-enum overrides. Manifest mirrors the editor's peer split; `powerbi-compat` is peer-only so the singleton canary passes; no `tsdown.config.ts`, so its `neverBundle` check does not apply.
- **Env reads stay verbatim** (`process.env.X`), relying on the visual's `DefinePlugin`, as app-core's dist already does.
- **Parity bar** as in step 2: non-content strict-PASS, `content.js` differs by design, `visual.js` within 1%, Desktop smoke checklist, per-PR baseline from the fork point. `content.js` differs in PR 1 because the seams restructure source modules (new files, moved exports), which changes webpack's module graph and IDs even with no package move; in PR 2 because the moved code is compiled by tsc into the package's dist and re-enters the bundle as different modules.

---

## Open Questions

### Resolved During Planning

- Seam shape: base class plus config (see Key Technical Decisions).
- Editor-card references in persistence: none. `migration.ts`, `state-management-migration.ts`, `context-menu-migration.ts`, `persist.ts`, `properties.ts` and the settings slice never touch the editor card; only the model class, generic defaults and the editor-preferences mapping do.
- Composed model typing: base type in the kernel, one app-side narrowing accessor.
- App and landing injection: App via config; landing needs none.
- Clipboard home: `@deneb-viz/utils/clipboard`.
- tsc configuration: vega-react's tsconfig plus powerbi-compat's const-enum overrides; workspace symlinks resolve the package, no `paths`.
- Layers: `app`, `feature`, `components`, `lib`, `state`, `i18n`; the visual keeps its hand-rolled invariants.
- Power BI ESLint plugin: added to the package's own `eslint.config.js` alongside the boundaries factory; the visual's config is unchanged.
- Harness location: moves to the package with the kernel; it imports only `lib/*`.
- DefinePlugin reach: confirmed by app-core precedent.
- Move manifest: below.
- Tooling registration: syncpack and `bin/sync-package-metadata.ts` glob `packages/*`; the certification-root-surface canary checks only the root manifest; CI runs generic turbo tasks. No registration needed beyond the visual's devDependency.

- No jsdom construction test for the kernel. The harness's fake host is a minimal structural subset (rendering events and fetch-more only) and the App closes over the live host, both stores and Vega's loader, which `apps/deneb/src/app/__test__/app-platform-provider-memoization.test.ts` records as the reason this workspace asserts on source structure instead of mounting component trees. Constructing the kernel would need a new full host double and a full App mount that pulls in the retained editor. The constructor is covered by the harness (update path), a source-structure invariant on the entry, and the Desktop smoke checklist; the editor-free proof is the reachability canary.
- Host barrel export list: enumerated in U6 from the actual app-side imports.

### Deferred to Implementation

- Whether `SplashInitial` carries visual-specific branding. If it does, it joins the landing-page components on the app side.
- Which keys of `apps/deneb/src/i18n/en-US.json` are consumed by kernel-side components; decided by a usage grep when splitting.
- Whether the rendering-lifecycle overlay observer wiring crosses from the kernel class into `features/` (allowed for the `app` layer) or is already injected through `lib/rendering-lifecycle`; either satisfies the boundaries model.
- Whether vitest in `apps/deneb` needs an alias for the package once app-side tests import its dist; vite inlines linked workspace packages, so none is expected.

---

## Output Structure

Expected layout after PR 2. The per-unit file lists are authoritative.

```
packages/powerbi-host/
  package.json                     tsc build, peer split mirroring the editor
  tsconfig.json                    base + jsx + const-enum overrides
  eslint.config.js                 boundaries factory + powerbi-visuals plugin
  turbo.json                       pins @deneb-viz/app-core#build
  vitest.config.ts                 jsdom + powerbi utils pre-bundle
  README.md
  src/
    index.ts                       public entry (was apps/deneb/src/host.ts)
    app/                           visual-kernel.ts, kernel-config types, app props type
    components/                    dev-overlay-shell, collapsible-section (shared by the overlays)
    features/                      status (generic pieces), viewport-gate-debug-overlay,
                                   visual-update-history-overlay
    lib/                           application, dataset, host (+ download-permission),
                                   interactivity, persistence (generic cards, service, migrations),
                                   rendering-lifecycle, state (sync, generic mappings, display-mode),
                                   vega-embed, keyboard-focus.ts
    state/                         the six slices and the store
    i18n/                          kernel strings
    __test__/harness/              moved harness
    __tests__/                     architecture-boundaries, kernel-is-editor-free,
                                   certification invariants (safety-net bound)

apps/deneb/src/
  index.ts                         export class Deneb extends the kernel base
  app/                             app.tsx, report-view-router, platform-search-contributions,
                                   kernel-config.ts, visual-settings.ts (composed model + accessor),
                                   editor-preferences-sync.ts, settings-editor.ts
  features/settings, features/toaster, features/status (landing-page components only)
  i18n/                            app strings
  __test__/invariants/             visual-side canaries
```

---

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

```
apps/deneb/src/index.ts                      packages/powerbi-host
────────────────────────                     ─────────────────────
export class Deneb extends VisualKernel {
  constructor(options) {
    super(options, KERNEL_CONFIG)  ───────►  VisualKernel constructor (inside its try block)
  }                                            ├─ config.installState?()  ► app-core store singleton
}                                              ├─ bind host services, persist host,
                                               │  interactivity, locale(kernel ext + config ext),
KERNEL_CONFIG = {                              │  vega extensibility, formatting service(config model)
  settingsModel: VisualFormattingSettingsModel ├─ initializeStoreSynchronization(config.syncSlices)
  App,                                         ├─ mount <config.App host adapters/>
  translations: I18N_TRANSLATIONS,             ├─ update(): dataset resolution(config.featureFlags)
  featureFlags: FEATURES,                      └─ destroy()
  syncSlices: [editorPreferencesSync],
  installState: installEditorState
}
```

Dependency direction after PR 2:

```
apps/deneb ──► @deneb-viz/editor ──► @deneb-viz/app-core ──► powerbi-compat, vega-*, data-core, utils
     └──────► @deneb-viz/powerbi-host ──────────┘
                     (never ► editor)
```

---

## Implementation Units

### Phase 1: PR 1, seams inside apps/deneb

- U1. **Clipboard helper to utils**

**Goal:** Give the dev overlay's one editor import a non-editor home so the kernel set can be editor-free.

**Requirements:** R3

**Dependencies:** None

**Files:**

- Create: `packages/utils/src/clipboard.ts` (moved from `packages/editor/src/lib/clipboard.ts`), `packages/utils/src/__tests__/clipboard.test.ts` (moved from `packages/editor/src/lib/__tests__/clipboard.test.ts`)
- Modify: `packages/utils/package.json` (new `./clipboard` subpath export; mirror how existing subpaths such as `./logging` are declared), utils build config if subpaths are enumerated there, `packages/editor/src/features/project-export/components/export-buttons.tsx`, `packages/editor/src/index.ts` (drop the re-export), `apps/deneb/src/features/dev-overlay-shell/components/dev-overlay-shell.tsx`
- Delete: `packages/editor/src/lib/clipboard.ts`

**Approach:**

- Git-move the helper and its test; only import specifiers change. Confirm no other importer of the editor re-export exists before dropping it.

**Patterns to follow:**

- Existing utils subpaths (`@deneb-viz/utils/logging`, `/type-conversion`).

**Test scenarios:**

- Happy path: the moved test passes unchanged in utils.
- Error path: the editor build fails if any remaining import of the deleted module exists (type enforcement; no new test).

**Verification:**

- utils, editor and the visual build; the dev overlay shell imports nothing from the editor package.

---

- U2. **Settings model split**

**Goal:** Separate the generic settings model from this visual's composition so kernel code is agnostic to app-contributed cards.

**Requirements:** R7, AE3

**Dependencies:** None

**Files:**

- Create: `apps/deneb/src/lib/persistence/model/host-settings-model.ts` (base model: generic card fields, `cards`, `resolveDeveloperSettings`), `apps/deneb/src/app/visual-settings.ts` (the visual's model extending the base with the editor card; the typed accessor for editor-card reads; the `maxLineLength` default), `apps/deneb/src/app/settings-editor.ts` (moved from `lib/persistence/model/settings-editor.ts`), `apps/deneb/src/lib/persistence/model/__test__/host-settings-model.test.ts`
- Modify: `apps/deneb/src/lib/persistence/model/visual-formatting-settings-service.ts` (populate by the class it is given at bind time rather than a hard-coded import), `apps/deneb/src/lib/persistence/model/constants.ts` (drop the `editor` defaults), `apps/deneb/src/lib/persistence/model/index.ts` and `apps/deneb/src/lib/persistence/index.ts` (re-export the base instead of the deleted class), `apps/deneb/src/state/settings.ts`, `apps/deneb/src/lib/state/sync-types.ts`, `apps/deneb/src/lib/state/project-sync-mappings.ts`, `apps/deneb/src/lib/state/display-mode.ts`, `apps/deneb/src/lib/persistence/migration.ts`, `apps/deneb/src/lib/dataset/data-view.ts`, `apps/deneb/src/__test__/harness/update-cycle-driver.ts`, `apps/deneb/src/lib/state/__test__/project-sync-mappings.test.ts`, `apps/deneb/src/lib/persistence/__test__/migration.test.ts` (all retyped against the base; type-only changes), `apps/deneb/src/lib/state/editor-preferences-sync-mappings.ts` (read through the accessor), `apps/deneb/src/index.ts` (bind the service with the visual's model class), `apps/deneb/src/__test__/invariants/settings-resource-keys.test.ts` (extend its flat directory scan to `apps/deneb/src/app/settings-editor.ts` and `visual-settings.ts`, and assert the editor keys are still counted so relocation cannot silently shrink coverage)
- Delete: `apps/deneb/src/lib/persistence/model/visual-formatting-settings-model.ts` (replaced by the two files above)

**Approach:**

- The base class keeps `resolveDeveloperSettings` and exposes its generic card list; the subclass composes `cards` as the editor card followed by that list, which reproduces today's order (editor, display, dataLimit, stateManagement, vega, developer) without duplicating the base's fields.
- The service is bound with a model class once (it is already bound once with the localisation manager); `getVisualFormattingModel` populates whichever class was bound.
- The accessor is the single place the app asserts the base model to the visual's model; its docblock states the invariant that makes the assertion sound (the app is the sole binder of its model class). The sync mapping and settings-pane contributions read through it.

**Execution note:** Characterise the formatting-model output for the composed class before splitting, so the split is checked against the current card set and order.

**Patterns to follow:**

- `VisualFormattingSettingsService.bind` (existing bind-once singleton style).

**Test scenarios:**

- Happy path, covers AE3: the composed model built from a representative data view yields the card order editor, display, dataLimit, stateManagement, vega, developer, and hides developer, vega and state-management cards outside developer mode.
- Happy path: the resource-keys canary counts the editor card's display-name and description keys from their new location; removing the new scan path makes it fail.
- Happy path, covers AE3: a base-only model built from the same data view runs through property migration (`handlePropertyMigration` inputs) and persistence helpers without throwing or dereferencing an editor card.
- Edge case: generic `DEFAULTS` no longer contains an `editor` key; the visual's `maxLineLength` default is served by the app-side module and equals 40.
- Integration: `settings-resource-keys.test.ts` still resolves every display-name and description key of the composed model against en-US resources.

**Verification:**

- Formatting pane, persisted properties and the editor-preferences sync behave as today (smoke checklist); the kernel-side persistence tree has no reference to the editor card.

---

- U3. **Sync contributions as kernel input**

**Goal:** Let the app contribute slice syncs so the kernel's initialiser has no app-specific mapping.

**Requirements:** R7, R2

**Dependencies:** U2

**Files:**

- Create: `apps/deneb/src/app/editor-preferences-sync.ts` (moved from `lib/state/editor-preferences-sync-mappings.ts`, plus the slice sync definition that today lives inline in `sync.ts`)
- Modify: `apps/deneb/src/lib/state/sync.ts` (accept contributed definitions; register after the generic ones; tear down together), `apps/deneb/src/lib/state/sync-types.ts` (exported definition type), `apps/deneb/src/lib/state/__test__/create-slice-sync.test.ts` or a new `sync.test.ts`, `apps/deneb/src/index.ts` (pass the contribution)

**Approach:**

- The contribution is the same object shape `createSliceSync` already takes, so the app authors its mapping exactly as the generic ones are authored. The initialiser asserts that generic and contributed definitions target distinct slices before registering any of them.

**Patterns to follow:**

- The four existing `createSliceSync` registrations in `sync.ts`.

**Test scenarios:**

- Happy path: initialising with one contributed definition registers it and the returned teardown unsubscribes it along with the generic ones.
- Happy path: initialising with no contributions registers only the generic slices and syncs project, visual-render and compilation as before.
- Edge case: `createSliceSync` has no name registry (`name` is only a log-message prefix), so a contributed definition targeting a slice a generic definition already syncs would run as a second independent subscription and double-persist. Registration asserts that the slice targets of generic and contributed definitions are distinct, and the test proves a contributed definition aimed at an already-synced slice is refused at registration.

**Verification:**

- Editor preferences still persist and rehydrate in Desktop; `sync.ts` contains no reference to the editor card or the `editor` capabilities object.

---

- U4. **Feature flags as a parameter**

**Goal:** Remove the kernel's only import of app configuration.

**Requirements:** R6, AE2

**Dependencies:** None

**Files:**

- Modify: `apps/deneb/src/lib/dataset/drilldown.ts` (take flags), its callers in `lib/dataset/processing.ts` and `data-view.ts` as needed, `apps/deneb/src/lib/dataset/__test__/*` tests that touch drilldown, `apps/deneb/src/index.ts` (hold the flags and thread them into the update path)

**Approach:**

- Define the flags type next to the kernel config (U5 creates the config type; U4 can land it in `lib/dataset/types.ts` and U5 re-exports it). Thread by parameter, not by a new singleton.

**Patterns to follow:**

- `buildProcessingPlan` already resolves flags once before the row loop; the feature flag joins those inputs.

**Test scenarios:**

- Happy path, covers AE2: with the drilldown flag off and a data view carrying drilldown roles, processing leaves drilldown handling disabled.
- Happy path: with the flag on, processing enables it, matching today's behaviour when `features.json` is true.
- Error path: no module under `lib/` imports `apps/deneb/config` (asserted by the U6 boundary test).

**Verification:**

- `grep` for the config import under `lib/` and `state/` returns nothing.

---

- U5. **Kernel class and thin entry**

**Goal:** Split the entry into a reusable kernel base class and a composition-only subclass, with the app's contributions passed as config.

**Requirements:** R1, R2, R8, R9, R10, AE4, AE5

**Dependencies:** U2, U3, U4

**Files:**

- Create: `apps/deneb/src/kernel/visual-kernel.ts` (base class; everything in today's entry, with the editor install replaced by the config hook), `apps/deneb/src/kernel/kernel-config.ts` (config type, App props type, flags type), `apps/deneb/src/kernel/i18n/en-US.ts` and `index.ts` (kernel strings as a TypeScript module), `apps/deneb/src/app/kernel-config.ts` (the visual's config object, including the editor install as its state-install hook), `apps/deneb/src/lib/host/download-permission.ts` (moved from `app/download-permission.ts` with its test), `apps/deneb/src/__test__/invariants/entry-is-composition-only.test.ts`
- Modify: `apps/deneb/src/index.ts` (`export class Deneb extends VisualKernel`, forwarding options and config), `apps/deneb/src/app/app.tsx` (props typed from the kernel; download permission imported from its new home), `apps/deneb/src/i18n/en-US.json` (app keys only), `apps/deneb/src/__test__/invariants/certification-and-build-invariants.test.ts` (safety-net constant path)

**Approach:**

- The base class keeps the lifecycle byte-for-byte where possible: same constructor order, same update dispatch, same safety-net bound, same destroy. The config's state-install hook runs as the first statement inside the constructor's existing try block, where the editor install runs today, so a throw still degrades to the sanctioned construction-failure text. The subclass constructor only forwards options and config.
- Locale setup passes the kernel's extension followed by the config's, so app keys override kernel keys if both define one.
- The App component is mounted from config with the same props as today.
- The kernel folder is an `app`-layer folder in the future package; in PR 1 it may import from `lib/`, `state/`, `features/` freely.
- No construction test under jsdom (see Open Questions): the harness covers the update path, the entry invariant covers composition, the smoke checklist covers construction and teardown.

**Execution note:** Characterise the lifecycle with the existing harness before extracting; the harness drives `resolveDatasetUpdateAction`, `hasDataViewChanged` and the coordinator, and must pass unchanged after the split.

**Patterns to follow:**

- The `bind`-once singleton services already used by the entry; `apps/deneb/src/__test__/invariants/certification-and-build-invariants.test.ts` for source-structure assertions.

**Test scenarios:**

- Happy path, covers AE5: the entry file exports `Deneb` extending the kernel, contains no dataset-resolution, safety-net or teardown logic, and does not call the editor install directly (a text-level invariant test mirroring the safety-net assertion style).
- Happy path: the kernel invokes the config's state-install hook before any store read in the constructor; a config without the hook constructs the same way (asserted on the kernel source's statement order, or by a unit test of the constructor's pre-mount sequence if it can be isolated from React mounting).
- Happy path, covers AE4: the display-mode helpers still produce `landing`, the transition modes and `editor` for the documented host sequences (existing `display-mode-quirks.test.ts`, unchanged).
- Integration: the existing harness scenarios pass unchanged against the kernel's lib code.
- Edge case: the safety-net constant relocates and the certification invariant still asserts it is at most 10,000 ms at its new path.

**Verification:**

- The visual constructs, updates, enters and leaves the editor, and destroys as before (smoke checklist); the entry is under roughly forty lines of composition.

---

- U6. **Transitional host barrel, app-side rewrite, PR 1 canaries and gate**

**Goal:** Fix the package's public surface, route every app-side import through it, prove the kernel set is editor-free, and run the PR 1 proof.

**Requirements:** R5, R3, R20, R16, R17, R18, AE1, AE6, AE7

**Dependencies:** U1, U5

**Files:**

- Create: `apps/deneb/src/host.ts` (the barrel), `apps/deneb/src/__test__/invariants/host-barrel-boundary.test.ts`, `apps/deneb/src/__test__/invariants/kernel-is-editor-free.test.ts` and `_reachability-walk.ts` (cloned from app-core's, pointed at the visual's tsconfig)
- Modify: `apps/deneb/src/app/app.tsx`, `apps/deneb/src/features/settings/components/{cross-filter-max-data-points,cross-filter-mode-settings,interactivity-settings,interactivity-toggle}.tsx`, `apps/deneb/src/features/settings/helpers.ts`, `apps/deneb/src/features/toaster/components/notification-cross-filter-exceeded.tsx`, `apps/deneb/src/index.ts`, `apps/deneb/src/app/{kernel-config,visual-settings,editor-preferences-sync}.ts`, `apps/deneb/src/features/status/components/{landing-page,landing-page-card,landing-page-info-header}.tsx` (same-folder imports of the style hook, `StatusStackItem` and the application constants become barrel imports), `apps/deneb/src/features/status/index.ts` (keeps only the landing page; the generic re-exports move to the barrel) (all import from `'../host'` or `'./host'`)

**Approach:**

- The barrel's export list is the union of what app-side files import from kernel modules, enumerated from the current imports: the store hook and getter; `InteractivityManager`, its types and constants, and the context-menu, cross-filter and tooltip handlers; `persistOnCreateFromTemplate`, `persistProperties`, `resolveObjectProperties` and the `PersistenceProperty` type; `getVegaLoader`; `resolveDownloadPermitted`; `FetchingMessage`, `SplashInitial`, `Progress`, `StatusContainer`, `StatusStackItem` and the shared status style hook; the two overlay components with their enable flags re-exported under feature-specific names (both features export `IS_OVERLAY_ENABLED` today); `APPLICATION_NAME`, `APPLICATION_DESCRIPTION`, `APPLICATION_VERSION`; the base settings model, generic cards, defaults and service; the slice-sync definition type; the kernel class, config, App props and flags types.
- `features/status/components/index.ts` defines the style hook consumed by both kernel-side and landing-page components; it is kernel-side and the landing files import the hook from the barrel.
- Boundary test: app-side folders (`app/`, `features/settings`, `features/toaster`, the landing-page files under `features/status`, `index.ts`, `i18n/`) import kernel modules only via the barrel; kernel folders (`kernel/`, `lib/`, `state/`, the remaining `features/*`) never import the barrel and never import app-side folders. A flat specifier scan in the style of `editor-import-specifiers.test.ts`.
- Reachability canary: value-edge walk from `host.ts`; asserts no `@deneb-viz/editor` module and no `monaco-editor` module is reached. This is the AE7 proof landing before the move.
- PR 1 gate: build a certified package from the fork point and from the branch; parity tool; byte-probe `visual.js`; Desktop smoke checklist; `ci:local`.

**Patterns to follow:**

- `packages/app-core/src/__tests__/_reachability-walk.ts`, `apps/deneb/src/__test__/invariants/editor-import-specifiers.test.ts`.

**Test scenarios:**

- Happy path, covers AE7: walking value edges from the barrel reaches no editor-package or Monaco module.
- Error path: the walk's detection reports a violation for an in-memory graph containing an editor specifier (pure-function test, as the direction canary does).
- Happy path: no app-side file imports a kernel module by relative path; no kernel file imports the barrel.
- Error path: the boundary detection flags a fixture importing `../lib/interactivity` from `features/settings`.
- Integration, covers AE6: parity report non-content strict-PASS, `content.js` DIFF, `visual.js` within 1%.

**Verification:**

- PR 1 opened with parity report, byte probe and smoke checklist recorded; all canaries green.

---

### Phase 2: PR 2, the extraction

- U7. **Scaffold `packages/powerbi-host`**

**Goal:** Create the package skeleton with tsc build, lint, test and Turbo wiring, registered with the visual.

**Requirements:** R4, R11, R12, R13, R14, R15

**Dependencies:** U6 merged

**Files:**

- Create: `packages/powerbi-host/package.json`, `tsconfig.json`, `eslint.config.js`, `turbo.json`, `vitest.config.ts`, `README.md`, `src/index.ts` (placeholder until U8 moves the barrel in)
- Modify: `apps/deneb/package.json` (devDependency, matching how the other `@deneb-viz/*` packages are declared there), `CLAUDE.md` and `docs/DEVELOPMENT.md` (package list, build order), `.syncpackrc` if a version group needs the package

**Approach:**

- `package.json`: `type: module`, `main`/`types` to `dist`, scripts `build` (`clean` then `tsc -p`), `dev` (watch), `clean`, `typecheck`, `eslint`, `test`; peers mirroring the editor's split (app-core, powerbi-compat, vega-react, vega-runtime, Fluent, React, `powerbi-visuals-api`, formattingutils, vega, vega-lite); dependencies for what only this package uses (zustand, data-core, utils, configuration, fast-equals as needed).
- `tsconfig.json`: copy `packages/vega-react/tsconfig.json` (extends the `react-library` base config, which sets `jsx: react-jsx`; `rootDir: src`, `outDir: dist`, `declaration`, and the `**/*.test.*` / `**/*.spec.*` emit excludes, which means test files must be named `*.test.ts` or `*.test.tsx`) and add `isolatedModules: false` and `preserveConstEnums: false` from powerbi-compat. vega-react is the existing tsc-plus-JSX-plus-workspace-dist precedent; confirm `resolveJsonModule` is not needed (kernel strings are a TypeScript module).
- `eslint.config.js`: `createBoundariesConfig({ layers: ['app', 'feature', 'components', 'lib', 'state', 'i18n'] })` plus the `eslint-plugin-powerbi-visuals` recommended config.
- `turbo.json`: extend root; `build`, `test`, `bench` depend on `@deneb-viz/app-core#build` as the editor's does.
- `vitest.config.ts`: jsdom; the same esbuild pre-bundle alias for `powerbi-visuals-utils-formattingutils` as the editor's; no restrictive `include` glob (mirror the editor's default so `.test.tsx` files are collected; the visual's `.test.ts`-only pattern would silently skip them).

**Patterns to follow:**

- `packages/powerbi-compat/{package.json,tsconfig.json}`, `packages/editor/{package.json,turbo.json,vitest.config.ts,eslint.config.js}`.

**Test scenarios:**

- Existing glob-driven canaries pick the manifest up automatically:
- Happy path: `package-singleton-contract.test.ts` passes because powerbi-compat is peer-only; placing it under `dependencies` fails it.
- Happy path: `package-lint-coverage.test.ts` passes because the package has an `eslint` script and config.
- Error path: omitting either lint artefact fails lint coverage before any file moves.

**Verification:**

- `npm install` succeeds; `npm run build` orders app-core before the package and the package before the visual; the visual resolves the package.

---

- U8. **Move the kernel files and rewrite imports**

**Goal:** Relocate every kernel-side file per the manifest, with tests, and make the barrel the package entry.

**Requirements:** R1, R2, R5, R9, R21, R22

**Dependencies:** U7

**Files:**

- Move: every path marked K in the Move Manifest; `apps/deneb/src/host.ts` to `packages/powerbi-host/src/index.ts`; `apps/deneb/src/kernel/**` to `packages/powerbi-host/src/app/**`; `apps/deneb/src/kernel/i18n/**` to `packages/powerbi-host/src/i18n/**`; `apps/deneb/src/__test__/harness/**` to `packages/powerbi-host/src/__test__/harness/**`; the safety-net certification invariant and the reachability canary with its walker to `packages/powerbi-host/src/__tests__/`
- Modify: every app-side file importing `'../host'` or `'./host'` (specifier flip to `@deneb-viz/powerbi-host`); moved files' relative imports that crossed into app-side folders (there should be none after U6); `apps/deneb/vitest.config.ts` include patterns if the harness folder was matched by name

**Approach:**

- Git moves so history follows; rewrite only import specifiers, with the same scripted rewriter approach as the editor extraction. Two exceptions need real edits: the dev-overlay shell and collapsible section move to `src/components/` and the two overlay features import from there; and the safety-net certification invariant, which hardcodes the entry path and the visual's `_packages.ts` helper, is rewritten against the kernel class's path in the package rather than flipped.
- `process.env` reads are untouched.
- Audit moved modules for barrel round-trips (none expected: kernel files never import the barrel by U6's invariant).
- Dist inventory check recorded in the PR: the package's dist contains no editor or Monaco reference; the visual's bundle size is byte-probed.

**Patterns to follow:**

- The editor extraction's move unit and import rewriter; `apps/deneb` move in PR #764 for mechanics.

**Test scenarios:**

- Moved tests run in the package unchanged except for import paths.
- Test expectation for type enforcement: none -- the package has no dependency on the editor package or on `apps/deneb`, so any leftover reference is an unresolvable import and fails the build.
- Integration: the visual mounts the App from the app side with the kernel from the package and passes the Desktop smoke checklist.

**Verification:**

- Package builds with tsc, lints and tests; the visual builds; the package's dist has no editor or Monaco reference.

---

- U9. **Canaries, docs and PR 2 gate**

**Goal:** Enforce direction and layering in the new package, update documentation, and run the PR 2 proof.

**Requirements:** R13, R19, R20, R16, R17, R18, AE1, AE6, AE7

**Dependencies:** U8

**Files:**

- Create: `packages/powerbi-host/src/__tests__/architecture-boundaries.test.ts`
- Modify: `apps/deneb/src/__test__/invariants/package-dependency-direction.test.ts` (also assert the host package's manifest lists no editor dependency and its sources contain no editor specifier), `apps/deneb/src/__test__/invariants/editor-import-specifiers.test.ts` (still expects at least one editor import; add that no file imports the package's internals by deep path), the U6 host-barrel boundary test (now asserts app-side files import the package specifier and nothing under `packages/powerbi-host/src`), `packages/powerbi-host/README.md`, `packages/app-core/ARCHITECTURE.md` (mention the sibling package and direction), `CLAUDE.md`, `docs/DEVELOPMENT.md`

**Approach:**

- Direction canary reuses the existing pure detection function with the host package as a second subject.
- The reachability canary moved in U8 now walks from the package entry with the package's tsconfig.
- Boundaries canary is a copy of the editor's, pointed at the package config.
- Build a certified package from PR 1's merge commit and from the branch; parity tool; byte probe; smoke checklist; one holistic review across both PRs before merge.

**Patterns to follow:**

- `packages/editor/src/__tests__/architecture-boundaries.test.ts`, `package-dependency-direction.test.ts`.

**Test scenarios:**

- Happy path, covers AE1: the host package's manifest lists no editor dependency and its sources contain no editor specifier.
- Error path: the detection function reports a violation for an in-memory manifest listing the editor under any dependency map.
- Happy path, covers AE7: the reachability walk from the package entry reaches no editor or Monaco module.
- Happy path: the boundaries canary passes; a `lib` module importing a `feature` module is rejected.
- Integration, covers AE6: parity non-content strict-PASS, `content.js` DIFF, `visual.js` within 1% of the PR 1 baseline.

**Verification:**

- PR 2 gate recorded in the PR; documentation lists the package and the build order `… → app-core → editor / powerbi-host → apps/deneb`.

---

## Move Manifest

K = moves to the package in U8; A = stays in the visual. Derived from the 2026-09-17 audit; re-check against the U6 boundary test before executing U8.

| Path under `apps/deneb/src`                                                                                     | K / A                                                          | Notes                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                                                                                                      | A                                                              | Thin subclass after U5                                                                                                 |
| `host.ts`                                                                                                       | K → `src/index.ts`                                             | Package entry                                                                                                          |
| `kernel/**`                                                                                                     | K → `src/app/**`, `src/i18n/**`                                | Base class, config types, kernel strings                                                                               |
| `app/app.tsx`, `app/index.ts`, `app/report-view-router.tsx`, `app/platform-search-contributions.ts`             | A                                                              | Composition                                                                                                            |
| `app/kernel-config.ts`, `app/visual-settings.ts`, `app/editor-preferences-sync.ts`, `app/settings-editor.ts`    | A                                                              | Created or relocated in PR 1                                                                                           |
| `lib/host/**` (incl. `download-permission.ts` after U5)                                                         | K                                                              |                                                                                                                        |
| `lib/interactivity/**`, `lib/dataset/**`, `lib/rendering-lifecycle/**`, `lib/vega-embed/**`, `lib/application/**` | K                                                              | Tests follow                                                                                                           |
| `lib/persistence/**`                                                                                            | K                                                              | Editor card already relocated to `app/` in U2                                                                          |
| `lib/state/**`                                                                                                  | K                                                              | Editor-preferences mapping already relocated in U3                                                                     |
| `lib/keyboard-focus.ts` and its test                                                                            | K                                                              |                                                                                                                        |
| `state/**`                                                                                                      | K                                                              | All six slices, the store, tests                                                                                       |
| `features/status/components/{status-container,status-stack-item,progress,splash-initial,fetching-message}.tsx`, `features/status/components/index.ts` (shared style hook) | K                                   | `splash-initial` re-checked for branding at implementation; the style hook is exported from the package entry           |
| `features/status/components/landing-page*.tsx`, `features/status/index.ts`                                      | A                                                              | This visual's landing page and its barrel; imports the generic pieces, the style hook and the application constants from the package |
| `features/dev-overlay-shell/**`                                                                                 | K → `src/components/`                                          | Shell and collapsible section become a `components` layer; both overlay features import from it                        |
| `features/viewport-gate-debug-overlay/**`, `features/visual-update-history-overlay/**`                          | K                                                              | Env-gated, inert in certified builds; their sibling-feature imports are rewritten to the `components` layer            |
| `features/settings/**`, `features/toaster/**`                                                                   | A                                                              | Editor-facing                                                                                                          |
| `i18n/**`                                                                                                       | A                                                              | App keys only after U5                                                                                                 |
| `__test__/harness/**`                                                                                           | K                                                              | Imports only `lib/*`                                                                                                   |
| `__test__/invariants/certification-and-build-invariants.test.ts`, `kernel-is-editor-free.test.ts`, `_reachability-walk.ts` | K → `src/__tests__/`                                 | Follow their subjects                                                                                                  |
| `__test__/invariants/*` (all others)                                                                            | A                                                              | Visual-side canaries                                                                                                   |

---

## System-Wide Impact

- **Interaction graph:** construction order (host services, persist host, interactivity, locale, Vega extensibility, formatting service, store sync, React mount), the update dispatch and safety net, formatting-model construction, property migration, editor-preferences sync, drilldown gating and the dev overlays all cross the new boundary; each is pinned by a unit above and by the smoke checklist.
- **Error propagation:** unchanged. Construction failure still renders the sanctioned failure text; view-init failure still goes blank with the host warning icon; the coordinator's single-writer close semantics are preserved by moving it whole.
- **State lifecycle risks:** contributed sync slices register after the generic ones and tear down with them (U3 test); the config's state-install hook runs first inside the kernel constructor's try block, before any store read, which the constructor's statement order guarantees and a comment states.
- **API surface parity:** the package's public entry is the U6 barrel; the visual is the only consumer. `apps/web-client-sample` is unaffected.
- **Integration coverage:** Desktop smoke checklist per PR: cold viewer load with and without data, landing page, fetch-more path, open editor and return with no bounce, apply and discard, formatting pane card order and developer-mode toggling, editor preferences persist and rehydrate, cross-filter and cross-highlight, context menu, tooltips, drilldown role handling with the flag as shipped, external-URI loader behaviour in standalone mode, dev overlays visible only with the toggles on, safety-net firing on a stalled render.
- **Unchanged invariants:** the powerbi-compat singleton contract, the 10 s safety-net ceiling, the rendering-lifecycle single-owner pattern, the `Deneb` named export and `visualClassName`, capabilities and persisted-property names, the app-core store and its editor augmentation.

---

## Risks & Dependencies

| Risk                                                                                                     | Mitigation                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsc emits extensionless relative imports in dist that some consumer fails to resolve                    | Same shape as `powerbi-compat`'s dist, already consumed by app-core and its tests; webpack and vite resolve it; verified at U7 with the placeholder entry |
| Kernel constructor proves untestable under jsdom                                                         | Deferred-to-implementation note; fallback is the smoke checklist plus the harness, which already covers the update path                                 |
| A kernel module imports the barrel and trips a circular-init TDZ                                         | U6 boundary test forbids it; leaf-module learning applied                                                                                               |
| Formatting pane card order or developer-mode hiding changes with the model split                         | U2 characterisation of card names and order; smoke checklist                                                                                            |
| Editor-preferences sync silently stops after the contribution seam                                       | U3 registration and teardown tests; smoke checklist rehydrates preferences                                                                             |
| Stale `.tmp/webpack-cache` after the move produces ghost export warnings locally                         | `npm run dev` clears `.tmp/`; noted in the PR                                                                                                          |
| Parity report cannot isolate moved-code equivalence                                                      | Two-PR split; size bound and smoke checklist stand in for the renumbering proof, as in step 2                                                          |
| Manifest version bump in the working tree breaks metadata parity                                         | Kept out of both branches or committed separately before the fork point                                                                                |
| Const enums reach the bundle un-inlined if the package build ever switches to tsdown                     | `tsconfig` overrides as in powerbi-compat; the full type-checked package build is part of the gate; consider a canary asserting no `tsdown.config.ts` in the package |
| A throw in the editor state install escapes construction-failure containment                            | The install is a config hook run inside the kernel constructor's try block, where it runs today; the entry invariant forbids a direct call                            |
| The status style hook or the application constants are left with a relative import across the seam     | U6 lists the three landing files and the status barrels explicitly; the barrel boundary test rejects any residual relative import                                     |
| Same-named overlay flags collide in the package entry                                                    | Re-exported under feature-specific names; the barrel is the only place both are visible                                                                              |
| tsc plus JSX plus workspace-dist consumption goes wrong in the new package                              | `packages/vega-react` is the working precedent (tsc, `react-library` base, `.tsx` source, consumed from dist); U7 copies its tsconfig; kernel strings are a TypeScript module so no JSON asset emission is relied on |

---

## Documentation / Operational Notes

- Update `CLAUDE.md` (package list, build order, the singleton note now contrasts a peer singleton with a plain-dependency host package) and `docs/DEVELOPMENT.md`.
- Record both parity reports, byte probes and smoke checklists in the PR descriptions.
- After PR 2, developers restart `npm run dev` so the new package's watcher starts; remove the stale `../deneb-baseline` worktree from #770 and rebuild the baseline from the new fork point.
- Comments and test names in moved and new code describe current behaviour, never plan units or PR numbers.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-09-17-powerbi-host-package-extraction-requirements.md](docs/brainstorms/2026-09-17-powerbi-host-package-extraction-requirements.md)
- Related plans: `docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md`, `docs/plans/2026-09-14-003-tsdown-migration-plan.md`, `docs/plans/2026-09-04-001-apps-deneb-move-plan.md`
- Related code: `apps/deneb/src/index.ts`, `apps/deneb/src/app/app.tsx`, `apps/deneb/src/lib/state/sync.ts`, `apps/deneb/src/lib/persistence/model/`, `packages/powerbi-compat/tsconfig.json`, `packages/editor/package.json`, `packages/app-core/src/__tests__/_reachability-walk.ts`, `bin/verify-package-parity.ts`
- Related PRs/issues: #757, #764, #765, #768, #769, #770
