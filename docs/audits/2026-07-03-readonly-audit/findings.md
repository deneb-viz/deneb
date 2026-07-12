# Deneb Read-Only Audit — Findings Report

**Date:** 2026-07-03 · **Branch:** docs/u12-verification-checklist · **Engagement:** read-only; no fixes applied.
**Method:** baseline signal (`npx tsc --noEmit`: clean; `npm run eslint`: 9/9 packages pass) followed by four parallel traced audit passes per `instructions.md` (this directory): P1 async/lifecycle, P2 cross-package contracts, P3 data/logic integrity, P4 scoped security. P5 (quality) completed in a follow-up run (section below), alongside a cross-validation of `docs/ideation/2026-06-13-pre-2.0-refactoring-ideation.md` against the current tree.

**Tally:** 0 CRITICAL · 3 HIGH · 17 MEDIUM · ~40 LOW/informational. Every finding below includes the traced evidence chain; items that could not be fully traced are labeled UNVERIFIED.

---

## HIGH

### H1. No "still current" guard on the floating `vegaEmbed()` promise — stale embed overwrites newer embed's result and leaks the newer view
`packages/vega-react/src/hooks/use-vega-embed.ts:93-104` · P1

`useDeepCompareEffect` re-runs on spec/options change → finalizes `embedResultRef.current` (line 75 — `null` if the prior embed is still mid-flight) → starts embed B. If embed A (older) resolves after B, line 95 sets `embedResultRef.current = A.result`, overwriting B's stored result — B's view is never finalized (unmount cleanup at line 53 finalizes A's, the wrong one). A's resolution also calls `onEmbed` → `vega-embed.tsx:88-140 handleEmbed` → `VegaViewServices.bind(result.view)` (vega-embed.tsx:96) rebinds the module singleton (`packages/vega-runtime/src/lib/view/service.ts:15`) to a view whose DOM vega-embed already replaced, then `setViewReady(true)` and `generateRenderId()` — so dataset/signal debug listeners, the `denebContainer` viewport-signal effect (vega-embed.tsx:290-310), and the scroll-signal effect (visual-viewer.tsx:536-553) all target a detached view until the next compile. Same shape post-unmount: an in-flight embed resolving after unmount stores a result nobody finalizes and still calls `onEmbed`/Zustand setters.

**Suggested fix:** capture a generation counter (or abort token) per effect run; in `.then`/`.catch`, bail if stale — finalize the stale result immediately instead of storing it, and skip `onEmbed`/`onError`. Finalize in the unmount path against the live generation.

### H2. 500ms settle timer closes an in-flight render's lifecycle id — `renderingFinished` emitted to the host mid-render for any render slower than 500ms
`src/app/app.tsx:263-269` (+ `src/lib/rendering-lifecycle/coordinator.ts:107-124`) · P1

`update()` → `handleNormalFinalise` (src/index.ts:591) binds this update's pending-render id; the same update flows through `setVisualUpdateOptions` → App effect (app.tsx:251) schedules `setTimeout(onRenderingFinished, 500)` → `#onRenderingFinishedAdapter` (src/index.ts:214) → `coordinator.closePendingRender()` → `closeInternal` (coordinator.ts:107-124), which does **not** consult `state.renderStarted` — it unconditionally deletes the id and emits `renderingFinished`. If the compile→embed→`view.runAsync()` chain takes >500ms (large dataset / complex spec — exactly Deneb's use case), the host receives `renderingFinished` while the canvas is still painting; Power BI export/snapshot can capture pre-render content. The real `handleEmbed` close later no-ops via the exactly-once map guard. Asymmetry: the 10s safety-net *does* defer when `renderStarted === true` (coordinator.ts:160-169); this settle path bypasses that check. The effect's comment only contemplates the no-render case, not the slow-render case.

**Suggested fix:** give the settle path a `closePendingRenderIfNotStarted()` variant that no-ops (like the safety-net's defer) once `markPendingRenderStarted` has fired; the 10s safety-net remains the backstop.

### H3. Legacy migration's `consolidateFieldParameters=false` is ignored in the same mapping pass (stale Zustand snapshot) — legacy specs with field parameters render with wrong row shape; permanently so in read mode
`src/lib/dataset/processing.ts:303` · P3

`getMappedDataset` captures `const state = getDenebState()` once at processing.ts:254. The legacy migration (266-292) then calls `setSupportFieldConfiguration(...)` / `setDenebMetaVersion(...)` / `setConsolidateFieldParameters(false)` (285-287) — but the local `state` const is the pre-migration snapshot, so line 302-303 (`state.project.consolidateFieldParameters ?? true`) reads the pre-migration `true`. With consolidation on, `detectFieldParameterGroups` → `buildProcessingPlan` → `buildDataRow` emits `row[paramName] = [array]` while flat component field names are absent — breaking pre-2.0 specs that reference flat names. Edit mode self-heals after one bad render (persisted `false` echoes back). **Read mode never heals:** `setReadModePersistSuppressed(true)` (src/index.ts:288-289) blocks persistence (create-slice-sync.ts:161-166); the next inbound sync reverts to persisted values, the migration re-runs every data change and always re-reads the stale `true`.

**Suggested fix:** after the migration block, re-read from `getDenebState()` (or `const consolidate = legacy ? false : (state.project.consolidateFieldParameters ?? true)`).

---

## MEDIUM

### M1. Cross-filter and context-menu handlers close over embed-time `dataset` — stale row-identity resolution after incremental updates
`src/app/app.tsx:162-180` + `src/lib/interactivity/cross-filter.ts:38-68`, `src/lib/interactivity/context-menu.ts:19-39` · P1

`viewEventBinders` memo creates handlers closing over the render-time `dataset`; binders are applied to the view only in `handleEmbed` (vega-embed.tsx:119-123). The incremental-update path (visual-viewer.tsx:307 → `view.data()`) replaces view data **without re-embedding**, so attached `click`/`contextmenu` handlers keep the old closure. `getResolvedRowIdentities`'s field-matching fallback (src/lib/interactivity/data-point.ts:61-80) matches against stale `dataset.values`, and the "all rows selected → clear" decision compares stale `values.length` (data-point.ts:73). Contrast: `tooltip.ts:48-50` reads state lazily at invocation for this exact reason.
**Fix:** read `fields`/`values` from the store at invocation time (mirror tooltip.ts); drop `values` from memo deps.

### M2. `console.warn` monkey-patch not overlap-safe; captured warnings never consumed
`packages/vega-react/src/hooks/use-vega-embed.ts:82-104` · P1

Embed A patches `console.warn`; embed B starting before A's `.finally` captures A's patched warn as its "original." A restores the real warn; B then restores A's patched warn — permanently installed. Compounding: `warningsRef` (line 48) is written but never read anywhere — the capture apparatus is dead weight with a live footgun.
**Fix:** delete the capture (nothing consumes it), or reference-count the patch.

### M3. `InteractivityManager.crossFilter(...)` floating promises — host selection rejections escape the catch, selection state silently diverges
`src/lib/vega-embed/cross-filter-expressions.ts:46,140` + `src/lib/interactivity/cross-filter.ts:64` · P1

Vega expression → `createCrossFilterApplyHandler` → `InteractivityManager.crossFilter(result)` (not awaited, no `.catch`) → `_selectionManager.select(...)`. The `try/catch` at cross-filter-expressions.ts:84-159 only catches synchronous throws; an async rejection becomes an unhandled rejection — selector statuses never update, visual selection diverges from the host, no `logWarn` feedback fires. Same at the clear handler (line 46) and simple-mode handler (cross-filter.ts:64).
**Fix:** `.catch()` at each call site routing into the existing warning channel; optionally reset selector state.

### M4. `async` Zustand slice setters convert synchronous failures into unhandled rejections that bypass `update()`'s catch — lifecycle coordinator never sees the failure
`src/state/updates.ts:91` (also `src/state/dataset.ts:98`, `src/state/interactivity.ts:17`) · P1

`update()` → `setVisualUpdateOptions({...})` (src/index.ts:341, not awaited). The setter is `async` with zero awaits; a throw inside `getVisualFormattingModel` (updates.ts:93) or the `set()` updater rejects the returned promise instead of propagating to `update()`'s catch (src/index.ts:292) — `coordinator.failCurrent(e)` never runs, the update proceeds against unset settings, and the id closes via a success path. Violates the coordinator's truthful-or-loud invariant (coordinator.ts:60-67).
**Fix:** drop the `async` keyword from setters that don't await, or explicitly await/`.catch`-route in `update()`.

### M5. Delayed tooltip `setTimeout(show, delay)` has no cancellation — resurrects a dismissed tooltip
`src/lib/interactivity/interactivity-manager.ts:413-414` · P1

`tooltip.ts:67-76` schedules `setTimeout(show, multiSelectDelay)` with no stored handle. Mouse-off calls `hideTooltip()` (tooltip.ts:78) — then the earlier timer fires and shows the stale `dataItems`/`rowNumbers` closure. Consecutive shows also stack timers.
**Fix:** keep the latest timer handle in module state; clear in `hideTooltip` and at the top of `showTooltip`.

### M6. `setSignalByName` fires `view.runAsync()` as a floating promise with no `.catch`
`packages/vega-runtime/src/lib/view/service.ts:100-105` · P1

Viewport-resize (vega-embed.tsx:290-310) and throttled-scroll (visual-viewer.tsx:536-553) effects → `view?.signal(name, value); view?.runAsync();`. Vega routes some dataflow errors through promise rejection; this one surfaces nowhere (contrast the tooltip path's `.catch` → `logError` at vega-embed.tsx:267, and `incremental-update.ts:106-122` which handles both channels).
**Fix:** at minimum `.catch(logDebug)` inside the service; ideally route to `compilation.logError` at call sites.

### M7. Per-call `view.error` handler override not overlap-safe — two in-flight incremental updates restore in the wrong order, leaving a stale override installed
`packages/app-core/src/features/visual-viewer/incremental-update.ts:59-70` · P1

`viewReady` is not toggled during an incremental update, so a second rapid Power BI update can start `performIncrementalUpdate` while the first's `runAsync()` is pending. Update 2 captures update 1's override as "original" (line 61); restores race and update 1's override ends up permanently installed, writing into a dead `internalErrorMessage` capture. Same structural bug as M2.
**Fix:** serialize incremental updates (in-flight flag keyed to the view), or token-check before restoring.

### M8. `Deneb` implements no `destroy()` — document keydown listener, React root, armed safety-net timer, and the bound view singleton are never torn down
`src/index.ts:150` (listener at :716-734) · P1

`bindTabCycling` attaches `document.addEventListener('keydown', ...)` with no removal path; `#root` is never unmounted (so `useVegaEmbed`'s unmount finalize never runs); a safety-net `setTimeout` armed in `update()`'s finally can fire after host teardown. Mitigated today by per-visual iframe isolation, but the API contract offers `destroy()` for exactly this.
**Fix:** implement `destroy()`: unmount root, remove listener, fail/close any open lifecycle id, `VegaViewServices.clearView()`.

### M9. Mixed-highlight dataview (some value columns with `highlights`, some without) → `undefined` in value-entries → TypeError → entire dataset silently dropped
`src/lib/dataset/values.ts:115-126` · P3

`getMeasureValueEntries` returns `useHighlights ? v.highlights : v.values`, where `doesDataViewHaveHighlights` (data-view.ts:22-24) is true if *any* column has highlights — a column lacking them contributes `undefined`, masked by the `as powerbi.PrimitiveValue[][]` cast. Consumed at processing.ts:472-474: `undefined[r]` throws → caught at processing.ts:521-524 → `getEmptyDataset()` → blank visual with only console `logError` (invisible at certified LOG_LEVEL=0). The support-field provider anticipates per-column missing highlights (support-field-provider.ts:81-83); this path lacks the same guard.
**Fix:** per-column fallback `v.highlights ?? v.values` in both entry builders.

### M10. Legacy migration is not partial-state safe: rebuilds `supportFieldConfiguration` from scratch; three persists are non-atomic — a config-persisted/metaVersion-not split causes re-migration to wipe user customisations
`src/lib/dataset/processing.ts:266-292` + `src/lib/state/create-slice-sync.ts:178-239` · P3

`isLegacySpec` (support-field-migration.ts:14-20) keys only on `spec !== default && denebMetaVersion < 2`, ignoring an already-populated `supportFieldConfiguration`. The migration overwrites config wholesale, and the three `set*` calls emit three separate `persistProjectProperties` host calls (config → metaVersion → consolidate). If the session ends between the first and second, persisted state is partially populated; next load re-runs the migration and overwrites any interim user edits. Re-migration output also varies with the current `crossHighlightEnabled` master setting (resolve-defaults.ts:31-40).
**Fix:** merge existing explicit entries over migrated defaults (`{ ...migratedConfig, ...existingConfig }`); treat non-empty persisted config as non-legacy evidence; stamp all three properties in a single store update so one subscriber pass emits one batched persist.

### M11. Any exception in `getMappedDataset` silently swallows the whole dataset — blank visual, no user-facing signal, migration side effects already committed
`src/lib/dataset/processing.ts:521-524` · P3

`catch (e) { logError(...); return empty; }` — console-only, and certified builds ship LOG_LEVEL=0. Because the migration runs inside the try before row building, a later throw (e.g. M9) leaves `denebMetaVersion=2` + stamped config committed (and persisted in edit mode) even though no dataset was produced.
**Fix:** surface a durable error into the compilation slice / status overlay; move the migration commit after successful row building or make it transactional.

### M12. `__isInitialized__` computed from the *partial* sync payload — any partial inbound sync marks an uninitialized project as initialized
`packages/app-core/src/state/project.ts:375` + `packages/app-core/src/lib/project/utils.ts:5-11` · P3

`createSliceSync` payloads contain only changed keys; `isProjectInitialized(payload)` tests `payload.config !== default || payload.spec !== default` — with those keys `undefined`, the test is trivially `true`, so e.g. a `logLevel` change on a brand-new visual flips `__isInitialized__`. Consumer: `use-editor-mode-sync.ts:99-107` gates the Create-dialog auto-open on it — dialog suppressed. (First hydration is safe: it syncs all keys.)
**Fix:** compute `isProjectInitialized(updatedProject)` on the merged state built two lines later.

### M13. Viewer mode renders JSONC parse errors nowhere — silently blank visual (editor path is clean)
Parse chain (P3) — `parse.ts:72-90` → `compile.ts:47-54` → `compilation.ts:318-341`

Errors propagate correctly as data and the previous view/DOM is properly cleared (no stale render: use-vega-embed.ts:59-69, vega-embed.tsx:234-241). The editor shows them in the debug area (log-viewer.tsx:67-72). But no component outside the debug area renders `compilation.result.errors` — a report consumer sees a blank visual with no message.
**Fix:** minimal viewer-mode status overlay (or host `displayWarningIcon`) when `compilation.result?.status === 'error'`.

### M14. LOG_LEVEL fallback mismatch: a build with LOG_LEVEL *absent* from .env passes certification validation but ships with INFO-level logging enabled
`packages/utils/src/lib/logging.ts:58-63` + `webpack.common.config.js:198-199` + `bin/validate-config-for-commit.ts:8` · P4

Webpack DefinePlugin inlines `process.env.LOG_LEVEL ?? ''`; runtime `parseLogLevel('')` falls back to `DEFAULT_LOG_LEVEL = LogLevel.INFO`. The validator uses the opposite fallback (`parseLogLevel(process.env.LOG_LEVEL, 0)`), so a missing variable parses as 0 and passes the `LOG_LEVEL !== 0` check. At INFO, all `logError`/`logWarning`/`logInfo` calls emit, including the Vega logger bridge (`packages/vega-runtime/src/lib/extensibility/logging.ts:30-95`) which relays raw Vega warn/error text — messages can embed spec fragments and field names.
**Fix (code-side, no .env change):** make the runtime fallback NONE when the inlined value is empty, or make the validator treat missing LOG_LEVEL as an error, or have webpack inline `'0'` when unset.

### M15. `@deneb-viz/powerbi-compat` declared as devDependency (not peerDependency) in template-usermeta, which imports it
`packages/template-usermeta/package.json:37` · P2

`src/types.ts:3` does `import type { SelectionMode } from '@deneb-viz/powerbi-compat/interactivity'` while the package lists powerbi-compat only under `devDependencies`. Type-only (erased at build; tsc, nothing bundled) so runtime singleton risk is low — but the emitted `.d.ts` references powerbi-compat types, so consumers must have it resolvable; a peerDependency is the contract documenting this, and siblings (vega-runtime, json-processing, app-core) all declare it as a peer. `@deneb-viz/data-core` / `@deneb-viz/vega-runtime` are also type-imported yet devDeps-only (types.ts:1-2).
**Fix:** move to `peerDependencies`.

### M16. JSONC parse-with-result helper implemented twice
`packages/vega-runtime/src/lib/spec-processing/json.ts:24-43` vs `packages/json-processing/src/processing.ts:54-85` · P2

`parseJsonWithResult` and `getParsedJsonWithResult`+`getJsonPureString` are the same ~20-line algorithm (strip comments with a space to preserve line numbers, `JSON.parse` in try/catch, `{result, errors[]}` shape), differing only in error-enrichment tails. Dependency direction explains the split (json-processing peer-depends on vega-runtime), but `@deneb-viz/utils` sits below both.
**Fix:** hoist the shared core + result type into `@deneb-viz/utils`; keep decorations local.

---

## LOW

- **L1** `src/app/app.tsx:185-190` (P1) — `exportStatus().then(...)` has no `.catch`; a rejection leaves `isDownloadPermitted` stuck at `undefined` (indeterminate download UI) plus an unhandled rejection. Fix: `.catch` → deny by default + log.
- **L2** `packages/app-core/src/features/project-export/components/export-information.tsx:94-98` (P1) — `toImageURL(...)` has no `.catch` (silent preview failure), and `useCallback` deps are `[]` while the body reads `embedViewport` (stale scale after resize). Fix: add `.catch`; fix deps or read store at call time.
- **L3** `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx:248-255` (P1) — `getDataByName` swallows errors and returns `undefined` (service.ts:71-81); VisualViewer conflates "call failed" with "spec uses inline data" and silently drops a data update. Fix: distinguish the two; on failure fall through to full recompile.
- **L4** `packages/app-core/src/features/debug-area/components/signal-viewer/signal-value.tsx:84-98` (P1) — `removeListener` detaches via the live singleton view instead of the captured instance — the exact anti-pattern data-tab.tsx:324-330 documents and fixed. Editor-only; impact bounded by the finalize path. Fix: capture the view at effect entry.
- **L5** `src/index.ts:265-267` (P1) — constructor catch logs via `console?.error` and returns; a constructor failure leaves the visual permanently blank with no host signal, and later `update()` calls hit `this.#coordinator` on `undefined` (secondary TypeError). `console.error` is also the forbidden channel per the codebase's own comment at src/index.ts:296-298. Fix: construction-failed flag checked in `update()`; emit `renderingFailed` directly; render a static error element.
- **L6** `packages/utils/src/lib/logging.ts:135-139` via `src/index.ts:146-147` (P4) — `logHeading` bypasses the LOG_LEVEL gate: unconditional `console.info` at module load in every build (name+version only, no data). Fix: route through the gated logger.
- **L7** `packages/vega-runtime/src/lib/signals/migration.ts:107-112` (P4) — `logLegacySignalWarning` uses raw `console.warn` outside the gate (fixed string + count only). Fix: use gated `logWarning`.
- **L8** `packages/utils/src/lib/crypto.ts:7-11` (P4) — `getNewUuid()` builds v4-shaped UUIDs from `Math.random()`. All consumers traced as non-security (template uuid, renderId, worker jobIds). Hygiene fix: `crypto.randomUUID()`/`getRandomValues()` (supported in PBI sandbox iframes).
- **L9** `packages/app-core/src/features/visual-viewer/components/vega-embed.tsx:213` + `deneb-platform-provider.tsx:48` (P4) — `vegaLoader` is optional (default `null`) at the app-core layer; when absent, vega-embed falls back to Vega's default loader which fetches external URLs freely. The PBI visual always supplies the gated loader today (traced: app.tsx:133-143 → :327 → visual-viewer.tsx:174,465); risk is a future regression. Hardening fix: fail closed — require a loader in the platform contract or default to a restrictive one.
- **L10 (UNVERIFIED)** `src/lib/vega-embed/loader.ts:32-35` (P4) — `sanitize` for `context: 'href'` passes the spec-authored URI to `host.launchUrl(uri)` unconditionally, no scheme allowlist, regardless of ALLOW_EXTERNAL_URI. Intended PBI delegation pattern and host-mediated, but whether the host rejects non-http(s) schemes (e.g. `javascript:`) could not be verified from this repo. Hardening fix: allowlist `http:`/`https:` before `launchUrl`.
- **L11** `src/lib/vega-embed/cross-filter-expressions.ts:167-180` (P4) — placeholder substitution interpolates datum string values into the Vega filter expression as `'${value}'` without escaping quotes/backslashes; a value like `O'Brien` breaks out of the string literal (data-driven predicate injection). Blast radius confined to the Vega expression sandbox in the headless view (wrong/over-broad cross-filter or parse error; `parseExpression` at :110 rejects malformed results) — not code execution. Fix: escape `\` and `'` in substituted strings.
- **L12** `packages/vega-runtime/src/lib/signals/migration.ts:50-98` (P3) — pbiContainer→denebContainer migration is idempotent (verified: word boundaries, order, per-parse text-level only), but the regex also rewrites occurrences inside string literals/data values, and the deprecation warn fires on every parse (every keystroke) despite the "once per session" comment — no latch.
- **L13** `src/lib/dataset/support-field-provider.ts:83` + `packages/data-core/src/lib/value/highlight.ts:29-42` (P3, UNVERIFIED) — a highlights array shorter than values yields `__highlight__ = undefined` while `__highlight_status__` reports `'on'`. Unverified that Power BI ever ships a shorter array (contract is same-length with nulls).
- **L14** `src/lib/dataset/values.ts:13-19` (P3) — `getCastedPrimitiveValue` guards `!== null` but not `undefined`: dateTime cells reachable as `undefined` (OOB read at processing.ts:473, or via M9) produce `new Date(undefined)` = Invalid Date. Fix: `value != null`.
- **L15** `src/lib/dataset/values.ts:84-91` (P3) — `getFormatStringForValueByIndex` declared `: string` but a `<string>` cast hides possible `undefined`; downstream tolerates it, but the signature lies. Related: the `as PrimitiveValue[][]` casts in the entry builders are what convert M9 from a type error into a runtime crash.
- **L16** `src/lib/state/project-sync-mappings.ts:118-129` (P3) — corrupt persisted `supportFieldConfiguration` JSON silently degrades to `{}`; with `denebMetaVersion` already 2 no re-stamp occurs, so per-field flags vanish without signal.
- **L17** `packages/app-core/package.json:61-62 vs 87-88` (P2) — `@deneb-viz/vega-react` and `@deneb-viz/vega-runtime` declared in BOTH `dependencies` and `peerDependencies`; tsup externalizes both so nothing is inlined, but the double declaration contradicts the shared-instance intent. Fix: keep only the peer entries.
- **L18** `packages/app-core/eslint.config.js:17-24` (P2, observation) — tests/bench exempt from boundary checking, and `boundaries/no-unknown-files: 'off'` means `dist/` imports (e.g. `features/debug-area/workers/index.ts:6` importing a built worker) are unchecked. Traced: the one existing case stays within its own feature. No action required; consider a canary tying each `dist/worker/*.js` import to its source feature.
- **Cruft note** (P4): `@types/jsum` declared without a corresponding `jsum` runtime dependency — harmless types-only leftover.

---

## Clean areas (verified, not assumed)

- **Secrets:** no credential-like literals in `src/`, `packages/*/src`, `config/`; only high-entropy strings are base64 PNG thumbnails (catalog assets).
- **External-URI enforcement:** full chain traced — `src/lib/vega-embed/loader.ts` overrides `load` (data-URI-only when gated) and `sanitize` (blank PNG for non-data images); loader unconditionally injected in the shipped visual (app.tsx:133-143 → vega-embed.tsx:213); Monaco schema requests gated on the same flag and pinned to the bundled monaco (no CDN). No first-party `fetch`/XHR/WebSocket/`sendBeacon`/`eval`/`new Function`/web-storage anywhere.
- **Vega extensibility surface:** exactly six registered expression functions (registry.ts:17-24); none expose fetch, storage, DOM, or the raw selection manager; pattern-SVG ids sanitized; cross-filter apply mode-gated with bounded validation, evaluated in a headless sandboxed view.
- **Dependencies:** `npm ls --depth=0` resolves clean; all dependency names across root/packages/apps are real, well-known packages — nothing hallucinated.
- **Dev toggles:** every DefinePlugin-inlined flag covered by `bin/validate-config-for-commit.ts`; only the LOG_LEVEL-absent case drifts (M14).
- **powerbi-compat singleton:** contract holds at runtime everywhere (full compliance table in P2 pass); worker bundles verified not to smuggle a duplicate instance.
- **app-core layering:** no cross-feature or upward imports, including dynamic `import()`/`require()`/barrel-laundering sweeps; the 19 dynamic imports are all in tests.
- **Empty/zero-row/null dataview handling:** traced end-to-end and clean (early empty return; zero-row loop skip with metadata still emitted; null cells guarded; column/value array alignment verified gate-by-gate).
- **`buildProcessingPlan`/`buildDataRow`:** single-pass flag resolution, explicit-config-over-defaults, and parameter component index alignment all verified.
- **Parse/patch return types:** honest discriminated unions; all dereferencing callers guard on status; patch functions total.
- **Lifecycle coordinator core:** supersede/exactly-once/delete-before-emit invariants hold as documented — the defect (H2) is in the external settle-timer close path, not the coordinator.
- **Other verified-clean lifecycles:** `useViewportMatchGate` teardown; data-tab worker + data-listener add/remove symmetry; editor-area/import-dropzone/inspector-popover cleanups; schema/editor-init promise poison-caching avoidance.
- **Duplicate-utility sweep:** no duplicate debounce/UUID/hash/base64/logging/deep-clone/worker-blob helpers beyond M16.

---

## P5 — Quality (duplication · complexity · dead exports)

Dead-export claims were verified against package.json `exports` maps, tsup entry configs (including worker IIFE entries), a namespace-import scan (zero `import * as` hits for `@deneb-viz/*`), and reference sweeps covering `src/`, `packages/`, `apps/` (web-client-sample as external embedder), `bin/`, and tests. app-core public exports were deliberately not flagged (embedder caveat).

### M17. `getSignalPbiContainer` is a line-for-line copy of `getSignalDenebContainer` — and the copy (plus its whole module) has zero consumers
`packages/powerbi-compat/src/lib/signals/pbi-container.ts:10-40` vs `packages/vega-runtime/src/lib/signals/deneb-container.ts:63-93`

Byte-identical 6-field container-signal construction (height/width/scroll* with identical `||` fallback chains) except signal name constant and type names — a divergence trap during the pbiContainer deprecation window. But the powerbi-compat copy is dead: zero occurrences of the `powerbi-compat/signals` import specifier anywhere; symbol scan found no external refs; the legacy migration lives in vega-runtime spec-processing, not here. The package.json `./signals` exports entry exists but nothing imports it.
**Fix:** delete the powerbi-compat signals module and its exports-map entry (resolves both the duplication and the dead code).

### Duplication (LOW)

- **P5-D1** `src/features/settings/styles.ts:13-26` ↔ `packages/app-core/src/features/settings-pane/styles.ts:8-21` — byte-identical `spinButtonContainer`/`spinButtonControl` Fluent style slots; visual-drift risk between root settings UI and app-core settings pane. Fix: hoist into a shared app-core style module.
- **P5-D2** `packages/app-core/src/catalog/vega/v-bar-interactive.ts:16-85` — catalog template `dataset` field-definition blocks duplicated 4-way across v-bar-simple.ts:12-73, vl-bar-interactive.ts:7-35, vl-bar-simple.ts:8-25. Static content, low risk; a `getStandardBarDataset()` helper would remove the copy-paste.
- **P5-D3** `packages/json-processing/src/__test__/field-tracking.test.ts:13-159` ↔ `workers/__tests__/tokenizer.test.ts:11-157` (plus remapping.test.ts:54-131, template-usermeta.test.ts overlaps) — ~147 lines of shared test fixtures duplicated; fixture drift can silently de-align the suites. Fix: shared `fixtures.ts`.
- **P5-D4** `zoom-level-popover.tsx:62-72` ↔ `zoom-slider.tsx:27-37` (debug-area zoom-controls) — identical 4-field Zustand selector. Fix: tiny `useZoomControlState()` hook.
- **P5-D5** `data-tab.tsx:483-496` ↔ `source-tab.tsx:200-213` — identical `DataTableViewer` prop-wiring block; these two tabs already show parallel-evolution symptoms (cf. the documented mirror comments).
- **P5-D6** (naming hazard, not code dup) `packages/app-core/src/lib/field-processing/tokenization.ts:22` and `packages/json-processing/src/lib/spec-processing/workers/remapping.ts:22` both export `getRemappedSpecification` with different semantics (async wrapper vs sync worker-side impl). Fix: rename the wrapper (e.g. `requestRemappedSpecification`).
- **P5-D7** (UNVERIFIED intent) root `src/state/dataset.ts`/`interface.ts` and app-core export same-named `create*Slice` factories with partially identical bodies — documented two-store architecture, so mirroring is intentional; flagged for awareness only.

### Complexity hotspots (LOW — flag-only; "untested" = no test references the symbol)

| Location | Size/branches | Coverage |
|---|---|---|
| `src/lib/interactivity/interactivity-manager.ts:40` | 434-line module, ~31 branch tokens (`_resolveRowNumber`:126, `addRowSelector`:235) | **Untested** — only appearance in tests is as a `vi.fn()` mock. Highest-risk untested hotspot: selection-ID resolution feeding cross-filtering |
| `src/lib/vega-embed/cross-filter-expressions.ts:52` | `createCrossFilterApplyHandler` 110 lines, ~16 branches + validators | **Untested** (also site of M3/L11) |
| `packages/app-core/.../data-tab.tsx:69` | ~432-line component, 19 branches, worker/listener/debounce orchestration | Shallow — listener-rebind and utils tested, component state machine not |
| `packages/app-core/.../settings-pane.tsx:73` | ~368-line component | State slice tested; component untested |
| `packages/app-core/src/app/editor/components/editor-area.tsx:47` | 181-line body, ~21 branches | **Untested** |
| `packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts:31` | 211-line hook; comment at :188 says sub-hook "order matters" | Only the scaling path tested; ordering unguarded |
| `packages/app-core/.../project-create/components/create-button.tsx:18` | nested `onCreate` (:35, 83L, 11 branches) | **Untested** — project-creation flow logic in a component |
| `packages/app-core/.../modal-dialog/modal-dialog.tsx:29` | 111 lines, ~10 branches | **Untested** |

For the record (high-branch but well tested, no action): `buildDataRow` (build-data-row.ts:27, ~27 branches), `parseSpec` (parse.ts:47).

### Dead exports (LOW confidence by design; verification method per entry)

- **P5-E1** `packages/powerbi-compat/src/lib/signals/*` — entire `./signals` subpath unconsumed (see M17).
- **P5-E2** `packages/vega-runtime/src/lib/extensibility/logging.ts` — `LocalVegaLoggerService`, `DispatchingVegaLoggerService` classes: definitions + barrel only; every external `from '@deneb-viz/vega-runtime/extensibility'` import line audited (only `VegaExtensibilityServices`, themes, scheme additions). UNVERIFIED residual: dynamic construction inside `VegaExtensibilityServices` not exhaustively ruled out — 1-minute check before deleting.
- **P5-E3** `packages/vega-runtime/src/lib/extensibility/scheme/powerbi.ts` — `registerCurrentPalette`, `getVegaSchemesPowerBi` definition-only; `getNamedColors` alive internally, just over-exported.
- **P5-E4** `packages/utils/src/lib/logging.ts` — `logHook` exported, zero references across the 90 files importing `utils/logging`. Delete.
- **P5-E5** `packages/json-processing/src/processing.ts` — `getParsedJsonWithResult` referenced only by its own barrel; the app consumes the vega-runtime copy (M16). Remove alongside the dedup.
- **P5-E6** `packages/json-processing/.../workers/field-tracking.ts` — six helpers carry `export` but are file-internal; worker bundles as IIFE so the exports serve nothing. Strip `export`.
- **P5-E7** `packages/vega-runtime/src/lib/embed/index.ts` — `RUNTIME_VERSIONS` on the public `./embed` subpath, internal use only.
- **P5-E8** `packages/utils/src/lib/base64.ts` — `BASE64_MIME_TYPE_PNG`, `TBase64DataEncoding` internal-only. Un-export.
- **P5-E9** `packages/utils/src/lib/object.ts` — types `DeepValue`/`DeepUpdate`/`StringifyOptions` have no external references (UNVERIFIED intent: may be deliberate typing surface for `prune`/`getValue` consumers).
- **P5-E10** `packages/template-usermeta/src/types.ts` — `UsermetaDeneb` has no in-repo consumer (UNVERIFIED intent: template-usermeta defines the exported-template JSON schema, so this may be deliberate public API for out-of-repo tooling).

Clean/noted: no namespace imports masking dead exports; `pattern-fill` subpath genuinely consumed; `APPLICATION_VERSION` double-definition is name-only coincidence; use-editor-pane-layout↔use-pane-hydration overlap is a hook-extraction mirror, not duplication.

---

## Cross-validation: `docs/ideation/2026-06-13-pre-2.0-refactoring-ideation.md`

Only one commit (docs-only, #685) has landed since the doc was written, so its ground truth is essentially frozen. **11 of 12 repo-grounded claims HOLD byte-accurately** (verified at their cited lines): the `isNewerVersion` gate (migration.ts:242) and `denebMetaVersion` stamp (settings-state-management.ts:29); CONTEXT_MENU_SPLIT_VERSION='2.0.0' with comment (migration.ts:391-400); CI validate-config gates (ci.yml:40,171); features.json = exactly `{"data_drilldown": false}`; the 30k ceiling exists in exactly one place (capabilities.json:362) with no benchmark asserting it; `SAFETY_NET_BOUND_MS = 10_000` (src/index.ts:105); the mirror-comment census re-ran at **22 hits** (in the claimed 17-24 band, all four exemplars at unchanged lines); the `@deprecated` with no removal target (deneb-container.ts:44); web-client-sample's `"*"` dep; the segmented-fetch harness quote (solution doc line 314, verbatim).

**One claim DRIFTED in characterization only:** the "18 `export * from` across 11 package index.ts" figures reproduce when counting all barrel files, but restricted to package *entries*, only app-core's has any (5) — package-wide, 15 of the 18 are in app-core. The wildcard-barrel problem is real but is almost entirely an app-core problem.

**Idea implementation status: all 7 ranked ideas NOT STARTED.** No fake-host/IVisualHost mock exists anywhere (the coordinator unit test predates the doc); no migration registry (`migration.ts` still scattered `isNewerVersion` gates); no deprecation ledger; 22 mirror comments still live; no singleton-contract or safety-net canary test (zero test hits for `SAFETY_NET_BOUND`); only pre-existing micro-benches, no 30k end-to-end benchmark; no api-extractor config. The U12 checklist that landed today (`docs/plans/2026-06-10-001-u12-lifecycle-compliance-verification.md`) covers idea #1's *scenario space* as a **manual** checklist — it is the smoke-testing state idea #1 proposed to automate, not an implementation of it. Its R9 section gives the 30k ceiling a manual verification step (still no automated budget).

### Audit ↔ ideation convergence

This audit independently confirms the doc's top bets with concrete defects:

| Ideation idea | Audit findings that validate it |
|---|---|
| #1 Fake-host lifecycle harness | H1 (embed race), H2 (settle-timer mid-render close), M4 (async setters bypass coordinator), M7 (overlapping incremental updates), M8 (no destroy()) — all are exactly the update()/lifecycle class a scripted harness would regression-trap |
| #2 Versioned stateManagement epoch + migration registry | H3 (stale snapshot in migration pass), M10 (non-atomic 3-persist migration, partial-state wipe), M11 (migration commits before row building succeeds), L16 (corrupt config degrades silently) |
| #4 Mirrors sweep | M16 (JSONC dup), P5-D1/D5 (settings styles, data/source tab mirrors — two of the 22 census hits are these exact files) |
| #5 Invariant canary pack | M15 + L17 (peer-dep/dual-declaration drift found in the wild — the singleton canary's exact target), M14 (validator/runtime LOG_LEVEL drift — a config-invariant canary), L18 (boundaries blind spots) |
| #7 API surface freeze | P5-E1–E10 (ten dead/accidental public exports, several on published subpaths — the "accidental API becomes permanent at 2.0" risk in miniature) |

Ideas #3 (deprecation ledger) and #6 (30k benchmark) gained no new defect evidence from this audit but their warrants re-verified as current.

---

## Outstanding UNVERIFIED items

Whether Vega's `view.finalize()` fully neutralizes listeners on old views (bears on residual severity of H1/L4); whether the host rejects non-http(s) schemes in `launchUrl` (L10); whether Power BI can ship a short highlights array (L13); `useDenebPlatformProvider` internal reference identity for the `onRendering*` adapters (does not change H2's validity); dynamic construction of the vega-runtime logger services (P5-E2); intent behind `object.ts` type exports (P5-E9) and `UsermetaDeneb` (P5-E10).
