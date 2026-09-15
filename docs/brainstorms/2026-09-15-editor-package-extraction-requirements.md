---
date: 2026-09-15
topic: editor-package-extraction
---

# Editor Package Extraction from app-core

## Summary

Extract a new editor package out of `@deneb-viz/app-core` so that app-core becomes a viewer-only core (provider, viewer, viewer state, platform contract, template import) and the editor package, depending on it one-way, owns every editor feature, the template catalog, editor-only UI, both web workers and the editor-only state slices. The Deneb visual is proven unchanged by the package-parity tool, and the viewer path is proven to carry no editor code.

---

## Problem Frame

`@deneb-viz/app-core` was created as "the core of a Deneb application", but it has grown into the whole application. An import-reachability audit on 2026-09-15 (relative imports walked from each entry) shows:

| Entry | Files reached (of 271) |
| --- | --- |
| `./editor` subpath | 261 |
| root barrel (`.`) | 132 |
| minimal viewer path (provider + viewer + gate + state) | 69 |

Roughly 196 files are reachable only through the editor entry. Meanwhile the root barrel, via the `TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI` re-exports that `packages/app-core/ARCHITECTURE.md` records as the package's single intentional layering exception, drags 66 editor-side files (settings-pane, template-metadata, UI toolbar and dialog primitives, the specification-editor context, field-processing, perf markers) into any consumer that only wants to render. Sixteen files in `apps/deneb` consume those leaked symbols, mostly the settings-pane platform contributions.

The store is monolithic: all fifteen Zustand slices are assembled in one place and the viewer path reaches every one of them, although only eight are ever read on that path. Four core slices (compilation, dataset, project, field-usage) write into editor-only slices (editor, create, export, commands), so the coupling runs in both directions.

The consequences today:

- A consumer that mounts only the viewer cannot avoid the editor graph without build-time aliasing, which the certification review process rules out because reviewers filter by directory, not by build flag.
- The transitional root-barrel exception has no natural closing point; each new visual-side feature reaches for another editor primitive.
- The certification review surface for the visual is the whole of app-core, when the runtime-relevant part is a quarter of it.
- The tsdown migration (#750, merged as PR #768) simplified app-core's build; reshaping the package again later would pay that configuration cost twice.

The `apps/deneb` move (#757, PRs #764 and #765) established the `apps/<visual>` and package-parity conventions this work builds on.

---

## Requirements

**Package shape**

- R1. A new workspace package under `packages/`, following the existing `@deneb-viz/*` naming, owns everything currently reachable only from app-core's `./editor` entry: the editor shell under `app/editor` (layout, panes, hotkeys, modal dialog, retained editor), the command-bar, compiled-vega, debug-area, project-export, settings-pane and specification-editor features, the catalog-create half of project-create, the template catalog and its thumbnails, the specification-editor context, the commands and Monaco lib modules, both web workers (data-viewer and JSON language), and editor-only lib modules. The unreferenced remap-fields feature is deleted, not moved.
- R2. `@deneb-viz/app-core` retains only the viewer-only core: the provider, the viewer and its viewport gate, viewer-live state, the platform-provider contract, i18n primitives, the template-import half of project-create (file drop, template validation, template information) and the template-metadata components it renders.
- R3. The dependency direction is strictly one-way: the editor package depends on app-core; app-core never imports from the editor package, at type level or value level.
- R4. app-core's `./editor` subpath export is removed. Consumers that need the editor import it from the new package.
- R5. The transitional root-barrel re-exports in app-core are retired in the same change. Symbols that are editor-side move to the editor package's public surface; the visual updates its imports accordingly.

**State**

- R6. Editor-only state slices (editor, export, debug, settings-pane, field-usage, commands) move to the editor package. Viewer-live slices (interface, compilation, project, visual-render, dataset, i18n, editor-preferences, migration, and create, which the template-import seam writes) stay in app-core.
- R7. Applications compose the store from core slices plus whatever editor slices they mount. A viewer-only application composes a store with no editor slices and no editor slice types.
- R8. State consumers keep a single store and the existing read/write hooks. The split changes how the store is composed, not how it is consumed.
- R9. Core slices no longer write into editor-only slices. The four existing core-to-editor writes are decoupled so that core state is complete and correct without any editor slice present.

**Project-create split**

- R10. Template import (file drop, template validation against the usermeta schema, template information display) is a viewer-safe feature in app-core with no dependency on the catalog, Monaco, or editor state.
- R11. The editor's create pane composes the core template-import feature rather than duplicating it.

**Monaco and editor coupling**

- R12. app-core has zero Monaco coupling after the cut, including type-only imports. Viewer-live code that currently references the specification-editor refs or reads editor dirty state (the apply-changes notification, the specification-editor refs contract) either moves to the editor side or is given a Monaco-free contract in core.
- R13. The editor package owns the Monaco dependency, the JSON language worker and the schema assets.

**Build and packaging**

- R14. Both packages build with tsdown under the conventions landed in #750 (ESM, `.js`/`.d.ts` contract, `fixedExtension` pinned off, singleton packages externalised, workers bundled as IIFE with hand-curated `alwaysBundle` lists).
- R15. The editor package externalises `@deneb-viz/powerbi-compat`, `@deneb-viz/vega-runtime`, `@deneb-viz/vega-react`, Fluent UI, React and `@deneb-viz/app-core`, so the visual continues to provide single runtime instances.
- R16. Turbo build ordering places the editor package after app-core and before `apps/deneb` and `apps/web-client-sample`.

**Behaviour preservation and proof**

- R17. No user-visible behaviour, capability, setting, or persisted-property change in the Deneb visual.
- R18. The package-parity tool (`bin/verify-package-parity.ts`) passes against a baseline built from each PR's fork point with every part strict-PASS except `content.js`. The module-ID-renumbering proof is not attainable here: the refactor PR changes logic, and the extraction PR re-chunks app-core's built output so webpack module bodies change even for moved code. `content.js` is instead covered by the full test suite, the bounded size check in R19, and a Desktop smoke checklist recorded in the PR.
- R19. The packaged `visual.js` does not grow beyond noise (within 1% of the baseline). The size delta is reported in the PR with byte-probe evidence from `.tmp/drop/visual.js`, not analyzer attribution.
- R20. A test-scope canary proves the viewer path is editor-free: from app-core's public entry, no file in the editor package and no Monaco value import is reachable. The canary must fail if a future change re-introduces either.
- R21. A test-scope canary proves the dependency direction: app-core's manifest and sources contain no reference to the editor package.
- R22. app-core's layered-boundary lint (`eslint-plugin-boundaries`) and its vitest canary carry across to the editor package with the same layer model, rather than being dropped.

**Consumers**

- R23. `apps/deneb` mounts the editor from the new package, composes the full store, and keeps its settings-pane platform contributions locally, importing the settings primitives they need from the editor package.
- R24. `apps/web-client-sample` stays editor-capable and consumes both packages.
- R25. The full test suite, ESLint (including the Power BI plugin gate over `apps/deneb`), Prettier and `npm run ci:local` pass.

---

## Acceptance Examples

- AE1. **Covers R3, R21.** Given the editor package exists, when app-core is built and tested in isolation, its manifest lists no dependency on the editor package and the direction canary passes.
- AE2. **Covers R7, R20.** Given an application that composes a store from core slices only and mounts only the provider and viewer, when its module graph is walked from app-core's entry, no editor-package file and no Monaco value module is reached.
- AE3. **Covers R9.** Given the same viewer-only store, when a dataset update, a compilation, or a project load runs, no core slice throws or dereferences a missing editor slice.
- AE4. **Covers R10, R11.** Given a template file is dropped on the editor's create pane, when the file is validated and its information displayed, the code that does so lives in app-core and the editor pane merely hosts it.
- AE5. **Covers R17, R18, R19.** Given a certified-mode package built from the branch and one built from its fork point, when the parity tool runs, every part other than `content.js` passes, and the `visual.js` byte delta is within 1%.
- AE6. **Covers R5, R23.** Given the visual's interactivity settings components, when they render inside the editor's settings pane, they import the accordion item, tooltip and spin-button primitives from the editor package and app-core's root barrel no longer exports them.

---

## Success Criteria

- The Deneb visual ships from the restructured tree with a parity report identical in shape to #750's: `content.js` differs by design; everything else strict-PASS; `visual.js` size within 1% of baseline.
- app-core's root barrel no longer carries a transitional exception; `ARCHITECTURE.md` records none.
- A viewer-only consumer can be built with app-core alone, and a canary fails the build if that stops being true.
- A planner reading this document can produce the move manifest (which file goes where) from the reachability audit without inventing product behaviour, and knows which questions are open.

---

## Scope Boundaries

- Extracting the Power BI host layer out of `apps/deneb` into its own package is a later step, after this one.
- No new visual, app, capabilities set, GUID or branding is part of this work.
- No viewer-only import shell or read-mode UX is built; only the seam for template import is carved.
- app-core's root barrel is trimmed, not replaced by per-concern subpath entries.
- No bundle slimming beyond what falls out of the cut: no non-Fluent create surface, no stubbing of settings-pane contributions, no dev-overlay changes.
- Settings-pane platform contributions stay in `apps/deneb`; they are not moved into either package.
- No public API documentation or changelog beyond the PR description; the packages are private workspace members.

---

## Key Decisions

- Cut line is "everything editor-only moves", not "Monaco only" or "features move, shared UI stays": the narrower cuts leave the root-barrel leak and the transitional exception in place, so a second extraction would follow.
- The store is split rather than left whole in core: the user chose state purity over the smaller diff, with the concrete cost (four core-to-editor writes to decouple) made visible before deciding.
- Template import stays in core and is carved now rather than moved and pulled back later: every affected file is being touched in this change, so the seam is cheapest to draw now, and a file-import capability is a reasonable viewer-side feature on its own terms.
- The catalog is editor-side: creating from the built-in template catalog is an editor workflow; importing a template file is not.
- Dependency direction is enforced by a canary, not convention, matching the singleton canary pattern already in the repo.
- Parity is proven with the same tool used for #757 and #750 for every non-content part. The module-renumbering equivalence flag is not applicable, because app-core's built output is re-chunked by the split; `content.js` is covered by tests, a bounded size delta and a smoke checklist instead.
- The work lands as two PRs: an app-core-internal refactor (store composition, write decoupling, Monaco-free viewer side, dead-code deletion) followed by the mechanical extraction. Reviewers see logic changes and file moves separately.
- Framed as part of the #757 restructuring: branch, PRs and this document reference #757 and describe monorepo housekeeping.

---

## Dependencies / Assumptions

- #750 (tsdown migration, PR #768) is merged to main; the editor package inherits its build conventions, including the six documented configuration landmines.
- The package-parity tool from #757 PR 1 supports the module-renumbering proof and runs from a main-built baseline.
- Work branches from `main`, not from the stale `chore/750-tsdown` branch.
- `apps/web-client-sample` has no consumers beyond the repo, so its import changes need no compatibility shim.
- The Deneb visual is the only certified consumer; there is no external consumer of app-core's `./editor` subpath.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R7, R8][Technical] How applications compose the store while consumers keep a single hook: a core store factory that accepts extra slices, an editor-side augmentation at import time, or an app-owned singleton passed through the provider.
- [Affects R9][Technical] For each of the four core-to-editor slice writes (compilation into editor and commands; dataset into create and export; project into editor and export; field-usage into editor and commands), whether the write inverts to an editor-side subscription, relocates wholesale to the editor package, or is replaced by a core-side event the editor listens to.
- [Affects R12][Technical] Whether the apply-changes notification and the specification-editor refs move to the editor package outright, or core keeps a Monaco-free refs contract that the editor populates.
- [Affects R1, R6][Needs research] The exact move manifest, derived by re-running the reachability audit after the template-import seam is drawn, including which `components/ui` primitives are viewer-live.
- [Affects R18][Technical] Whether the parity baseline is built once from the fork commit and cached, or rebuilt per PR, given the change may land as more than one PR.
- [Affects R22][Technical] Whether the editor package reuses app-core's ESLint boundaries configuration by import or carries a copy with the `feature` capture adjusted.
- [Affects R16][Technical] Whether the sync-packages and syncpack coverage need a new entry for the package, and whether the certification-root-surface canary from #765 needs to learn the new directory.
