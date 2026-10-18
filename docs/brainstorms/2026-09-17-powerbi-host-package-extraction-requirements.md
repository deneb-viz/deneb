---
date: 2026-09-17
topic: powerbi-host-package-extraction
---

# Power BI Host Package Extraction from apps/deneb

## Summary

Extract a new `powerbi-host` workspace package out of `apps/deneb` that owns the Power BI visual kernel: the `IVisual` lifecycle, the visual store, and every host-integration library. The visual's own tree shrinks to a thin composition layer that supplies only what this visual knows: its settings model, its App composition with the editor, its landing page, and its capabilities, manifest and locale. The Deneb visual is proven unchanged by the package-parity tool, and the kernel is proven to carry no editor code.

---

## Problem Frame

After the editor extraction (#757, PRs #769 and #770), the monorepo has a clean viewer core (`@deneb-viz/app-core`) and a one-way editor package (`@deneb-viz/editor`), each with a layered-boundaries model enforced by lint and canaries. The Power BI host integration has not had the same treatment. It lives entirely inside `apps/deneb/src`: 158 files and roughly 22,800 lines, of which the visual entry alone is 1,011 lines.

An audit on 2026-09-17 classified that tree:

| Concern                                                                                                                                                                | Files import from the editor package | Shape                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------- |
| Lifecycle, store, host services, interactivity, dataset mapping, persistence, rendering lifecycle, Vega embed, state sync, display mode, status pieces, dev overlays | 1 (a clipboard helper)               | Host-generic                |
| App composition, settings-pane contributions, apply-changes notification, editor settings card, editor-preferences sync, landing page                                  | 9                                    | Specific to this visual     |

The host-generic majority is not separable today:

- The entry file mixes lifecycle logic (construction, update dispatch, dataset resolution, safety-net timing, teardown) with app composition (which store slices to install, which App to mount). Nothing marks where one ends and the other begins.
- Nine host libraries import the visual store by relative path, and the dataset drilldown logic imports the app's feature flags by relative path, so the host layer is bound to this directory rather than to a contract.
- The visual's settings model bundles the editor card with the generic cards, so the persistence and formatting-model code is written against a shape that only this visual has.
- The host layer sits outside the layered-boundaries lint and the architecture canaries that protect app-core and the editor. Its only guards are hand-rolled invariant tests in the app.
- The certification review surface for the visual is the whole app directory, when the visual-specific part is a small fraction of it.

---

## Requirements

**Package shape**

- R1. A new workspace package under `packages/`, following the existing `@deneb-viz/*` naming, owns the Power BI visual kernel: the `IVisual` lifecycle (construction, update, formatting model, destroy, rendering-event emission and the 10-second safety net), the visual store and all six of its slices, host services, interactivity (selection, cross-filter, highlight, tooltip, context menu), dataset mapping (data view, field parameter detection, drilldown, support-field wiring and migration), the persistence core (persist, project, properties, migrations, read-mode gate) with the generic settings cards and the formatting-settings service, the rendering lifecycle coordinator, the Vega embed helpers, the state-sync infrastructure and its generic mappings, display mode, keyboard focus, application constants, the generic status pieces (splash, fetching message, progress, status container) and the dev overlays.
- R2. `apps/deneb` retains only what is specific to this visual: a thin entry, the App composition that mounts the editor and builds the platform provider, the settings-pane platform contributions and their search contributions, the apply-changes notification, the editor settings card, the editor-preferences sync mapping, the landing page, capabilities, manifest, the locale extension JSON, feature flags and config.
- R3. The dependency direction is strictly one-way: the host package depends on app-core and the packages below it; it never imports from the editor package, at type level or value level. The dev overlay's single editor import (a clipboard helper) is given a non-editor home.
- R4. The host package is a regular dependency of the visual, built to `dist/` and bundled by the visual's webpack build. It is not externalised by any package and is not a singleton peer: no package consumes it, and each Power BI visual runs in its own iframe.

**Seams between kernel and app**

- R5. App-side code reads and writes the visual store only through the host package's public entry. No deep imports into the package.
- R6. The kernel does not import app configuration. Feature flags the kernel needs (today, drilldown) are supplied by the app when the kernel is constructed.
- R7. The host package provides the generic settings cards (general, display, vega, data limit, state management, developer), their defaults and the formatting-settings service. The app composes its own settings model from those cards plus its own (the editor card) and hands it to the kernel. Kernel code that persists or migrates properties is written against the generic cards and a contract for app-contributed cards, not against this visual's model.
- R8. The app supplies its App composition to the kernel, and that composition owns the display-mode switch: when display mode resolves to landing it renders the app's own landing page, and in every other mode it renders the kernel's generic status pieces or the viewer and editor as today. The landing page is app-side; the generic status pieces are kernel-owned.
- R9. The display-mode machinery moves whole, including the editor and transition modes. A visual that does not advertise advanced edit mode never reaches those modes; no split is made.
- R10. The visual's entry contains composition only: it constructs the kernel with the app-specific parts from R6 to R8 and installs the editor's state slices. It implements no lifecycle logic of its own.

**Build and tooling**

- R11. The host package builds with the TypeScript compiler, not tsdown, so that `powerbi-visuals-api` const enums (five are used across the lifecycle, App composition and display mode) are inlined the same way `@deneb-viz/powerbi-compat` inlines them.
- R12. Turbo build ordering places the host package after app-core and before `apps/deneb`. It is independent of the editor package.
- R13. The host package adopts the shared layered-boundaries lint and the vitest architecture canary with the same layer model as app-core and the editor, declaring only the layers it has.
- R14. The Power BI ESLint plugin gate, which today covers only `apps/deneb`, also covers the host package's sources.
- R15. Repository tooling that enumerates workspaces (package sync, syncpack, prettier, the certification-root-surface canary) covers the new package.

**Behaviour preservation and proof**

- R16. No user-visible behaviour, capability, setting or persisted-property change in the Deneb visual.
- R17. The package-parity tool (`bin/verify-package-parity.ts`) passes against a baseline built from each PR's fork point with every part strict-PASS except `content.js`, which differs by design: module IDs are renumbered by the move and the package build re-chunks the moved code. `content.js` is covered by the full test suite, the bounded size check in R18 and a Desktop smoke checklist recorded in the PR.
- R18. The packaged `visual.js` stays within 1% of the baseline. The delta is reported in the PR with byte-probe evidence from `.tmp/drop/visual.js`.
- R19. A test-scope canary proves the dependency direction: the host package's manifest and sources contain no reference to the editor package.
- R20. A test-scope canary proves the kernel is editor-free: from the host package's public entry, no file in the editor package and no Monaco value import is reachable. The canary fails if a future change re-introduces either.
- R21. The existing host-layer test suites, including the update-cycle harness and scenario tests, move with their subjects and pass. ESLint, Prettier and `npm run ci:local` pass.
- R22. The dev overlays move with the kernel and stay inert unless the app's dev toggles enable them, as today.

---

## Acceptance Examples

- AE1. **Covers R3, R19.** Given the host package exists, when it is built and tested in isolation, its manifest lists no dependency on the editor package and the direction canary passes.
- AE2. **Covers R6.** Given the data-drilldown flag is off in the app's feature flags, when the kernel maps a data view with drilldown roles, drilldown handling stays disabled, and no kernel module imports the app's config directory to find out.
- AE3. **Covers R7.** Given a settings model composed from the generic cards plus the editor card, when the formatting pane is built and a property migration runs, the result is identical to today's; and given a model composed from the generic cards alone, the same kernel code runs without dereferencing a missing card.
- AE4. **Covers R8, R9.** Given a visual with no dataset, when display mode resolves to landing, the app's App composition renders the app's own landing page; when the host later enters advanced edit mode, the kernel's display-mode machinery walks the same transition modes and the App composition mounts the editor as today.
- AE5. **Covers R10.** Given the visual's entry after the move, when it is read, every `IVisual` method delegates to the kernel and the file contains no dataset-resolution, safety-net or teardown logic of its own.
- AE6. **Covers R16, R17, R18.** Given a certified-mode package built from the branch and one built from its fork point, when the parity tool runs, every part other than `content.js` passes, and the `visual.js` byte delta is within 1%.
- AE7. **Covers R20.** Given an application that constructs the kernel with a store of core slices only and supplies a viewer-only App composition, when its module graph is walked from the host package's entry, no editor-package file and no Monaco value module is reached.

---

## Success Criteria

- The Deneb visual ships from the restructured tree with a parity report identical in shape to #770's: `content.js` differs by design; everything else strict-PASS; `visual.js` within 1% of baseline; Desktop smoke checklist passed.
- The visual's entry is composition only, and the lifecycle it used to contain has a test suite that runs inside the host package.
- A Power BI visual can be built from the host package and app-core alone, with no editor package installed, and a canary fails the build if that stops being true.
- The host layer sits under the same layered-boundaries lint and canaries as app-core and the editor.
- A planner reading this document can produce the move manifest from the audit classification without inventing behaviour, and knows which questions are open.

---

## Scope Boundaries

- No second visual, app, capabilities set, GUID or branding is part of this work.
- No sharing of capabilities or webpack build tooling between apps. Duplication only exists once a second app does; this work must not make sharing harder, but does not attempt it.
- No viewer-only landing page or workflow is built; only the seam that lets an app supply one.
- The visual store and the app-core store stay separate; no merge.
- The host layer is not folded into `@deneb-viz/powerbi-compat` (it depends on app-core, which depends on powerbi-compat, so that would be a cycle), and powerbi-compat's surface does not change. Where moved libraries overlap powerbi-compat's interactivity or formatting subpaths, the overlap is left as-is; consolidation is a separate change.
- No bundle slimming beyond what falls out of the cut.
- `apps/web-client-sample` is untouched; it has no Power BI host.
- No public API documentation or changelog beyond the PR description; the package is a private workspace member.

---

## Key Decisions

- Cut depth is the kernel, not libraries only: the lifecycle is host-generic apart from one editor call, so leaving it in the app would make any second consumer re-implement a thousand lines, while the seam it needs (settings model, App, landing, flags) is small and already visible in the audit.
- The store moves with the kernel rather than being injected per app: no consumer needs a different store shape, and injection would add design surface for no current benefit.
- The package is a regular dependency, not a singleton peer: only apps consume it and Power BI isolates visuals in iframes, so the peer-plus-neverBundle discipline that `powerbi-compat` needs does not apply.
- The package builds with tsc: five `powerbi-visuals-api` const enums are used in the host layer, and tsdown cannot inline const enums from external declaration files. Same reason `powerbi-compat` uses tsc.
- The landing page is app-supplied, the other status pieces are kernel-owned: the landing page is the one status surface that describes this visual's workflow (it advertises the Edit button), and a viewer-only consumer will want its own.
- Feature flags are passed in, not imported: a relative import of the app's config directory is the one thing that would stop the kernel building outside this app.
- The display-mode machinery moves whole: splitting the editor and transition modes out would change logic for no consumer benefit, since they are unreachable when advanced edit mode is not advertised.
- Capabilities and build-tooling sharing is deferred to when a second app exists: the duplication is real but hypothetical today, and the certification build path (packages built to `dist/` first, then the app's webpack) is unchanged by this work.
- Two PRs again: seams inside `apps/deneb` first (feature-flag injection, settings-model composition, entry split into kernel and composition), then the mechanical move. Reviewers see logic changes and file moves separately.
- Framed as part of the #757 restructuring: branch, PRs and this document reference #757 and describe monorepo housekeeping.

---

## Dependencies / Assumptions

- #757 PR #770 (editor extraction) is merged to main as `ed7c7f26`; work branches from there.
- The package-parity tool from #757 PR 1 runs from a baseline built at each PR's fork point. The baseline worktree from #770 is removed first and rebuilt from the new fork point.
- The manifest version in the branch matches the baseline's; a version bump in the working tree is committed separately or excluded from the parity baseline, or the metadata part will not strict-PASS.
- Dev-toggle reads (`process.env` for dev mode, overlay and devtools) inside the package's built output are still replaced by the visual's webpack DefinePlugin at bundle time, so the overlays stay inert in certified builds. Verified in planning before the move PR.
- The Deneb visual is the only certified consumer; no external consumer depends on the layout of `apps/deneb/src`.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R10][Technical] The kernel's construction seam: a class the visual subclasses, a factory that returns an `IVisual`, or exported lifecycle functions the entry delegates to. Whichever keeps the entry composition-only with the least surface.
- [Affects R7][Needs research] Whether any persistence migration or the formatting-settings service references editor-card properties today; if so, how the app contributes migrations for its own cards.
- [Affects R7][Technical] How the composed settings model is typed so kernel code can address generic cards and remain agnostic to app-contributed ones.
- [Affects R8][Technical] The shape of the App and landing-page injection, and how display-mode routing renders an app-supplied component.
- [Affects R3][Technical] The non-editor home for the clipboard helper the dev overlay imports (an existing utils module or a small addition).
- [Affects R11][Technical] The tsc build configuration for a package that emits React components and consumes app-core's dist, matching powerbi-compat's conventions (ESM, `.js` and `.d.ts` contract).
- [Affects R13][Technical] Which layers the host package declares (features, lib, state at minimum) and whether the app keeps its hand-rolled invariant tests or migrates them to the boundaries model.
- [Affects R14][Technical] Whether the Power BI ESLint plugin is added to the host package's own config or hoisted into the shared config with a path filter.
- [Affects R21][Technical] Where the update-cycle harness and scenario tests live after the move, given they drive the whole kernel with a synthetic host.
- [Affects R22][Needs research] Confirmation that DefinePlugin replaces `process.env` reads inside package `dist/` consumed from `node_modules`, or the reads are hoisted to the app entry.
- [Affects R1][Needs research] The exact move manifest, derived by re-running the audit after the seams are drawn, including which persistence-model files are generic and which are this visual's.
