# Execution Handoff — 2026-07-03 Audit Remediation Program

**For:** the next agent session (any model) continuing this program.
**Authoritative plan:** `docs/plans/2026-07-03-001-fix-audit-remediation-program-plan.md` — read it fully before executing anything. Finding IDs (H/M/L/P5-*) resolve against `docs/audit-findings.md`. Both files plus this one are deliberately **untracked** — do not commit them with unit work.
**Skill:** execution runs under `/ce-work` conventions (task list, serial subagent per unit, orchestrator owns git).

## Program state (as of 2026-07-06)

| Unit | Status | Branch | PR | Base |
|------|--------|--------|----|------|
| U1 H3 hotfix | ✅ shipped | `fix/audit-u1-field-parameter-migration` | #687 | next |
| U2 Migration epoch | ✅ shipped | `fix/audit-u2-migration-epoch` | #688 | next |
| U3 Migration integrity | ✅ shipped | `fix/audit-u3-migration-integrity` | #689 | **#688's branch** (stacked; GitHub retargets on U2 merge) |
| U4 Harness + CI wiring | ✅ shipped | `feat/audit-u4-lifecycle-harness` | #690 | next |
| U5 Settle-timer + safety-net backstop | ✅ shipped | `fix/audit-u5-settle-timer` | #691 | next |
| U6 Embed generation guard + warn-capture drop | ✅ shipped | `fix/audit-u6-embed-race` | #692 | next |
| U7 index.ts hardening (M4/L5/M8) | ✅ shipped | `fix/audit-u7-index-hardening` | #693 | next |
| U8 Incremental-update serialization (M7/M6/L3) | ✅ shipped | `fix/audit-u8-incremental-update` | #694 | next |
| U9 Interactivity errors (M1/M3/M5/L11/M4) | ✅ shipped | `fix/audit-u9-interactivity-errors` | #695 | next |
| U10 LOG_LEVEL drift + logging gate (M14/L6/L7/L12) | ✅ shipped | `fix/audit-u10-log-level` | #697 | next |
| U11 Package-contract fixes + invariant canary pack (M15/L17 + vega-react lint + R6/R9 canaries) | ✅ shipped | `fix/audit-u11-package-contracts` | #698 | next |
| U12 Deprecation ledger + shim inventory (R7) | ✅ shipped | `docs/audit-u12-deprecation-ledger` | #699 | next |
| U13 Dataset value guards (M9/L13/L14/L15) | ✅ shipped | `fix/audit-u13-dataset-value-guards` | #700 | next |
| U14 Viewer spec-error (M13) — resolved **by design**, no code | ✅ shipped | `docs/audit-u14-viewer-blank-by-design` | #702 | next |
| U15 JSONC parse core dedup (M16 / P5-E5) | ✅ shipped | `refactor/audit-u15-jsonc-parse-dedup` | #703 | next |
| U16 Dead-export cleanup (P5-E1..E10 + IJsonParseResult + @types/jsum) | ✅ shipped | `refactor/audit-u16-dead-export-cleanup` | #704 | next |
| U17 Duplication cleanup (P5-D1..D6; D7 excluded) | ✅ shipped | `refactor/audit-u17-duplication-cleanup` | #705 | next |
| U18 Misc async & hardening (L1/L2/L4/L8/L9/L10) | ✅ shipped | `fix/audit-u18-async-hardening` | #706 | next |

**All 18 units complete** once #706 merges — the 2026-07-03 audit remediation program is done.

**Milestone (2026-07-10):** U1–U8 merged to `next` (PRs #687–#694). U9 shipped as open PR #695 (interactivity error-propagation cluster M1/M3/M5/L11 + the M4 selector-setter de-async deferred from U7). All 3 HIGH findings (H1/H2/H3) and the full async/lifecycle cluster (audit P1) are done. U10–U18 remain: cert/contracts/policy (U10–U12), data/UX (U13–U14), and the cleanup batches (U15–U18).

**Open-PR merge-overlap map (for whoever merges — conflicts are all additive/mechanical):**
- #691 (U5) ↔ #693 (U7): both touch `src/index.ts` and `src/__test__/harness/{scenarios.test.ts,update-cycle-driver.ts}` — both-add. Whichever merges second conflicts trivially.
- #694 (U8) is disjoint from the root-src PRs (app-core + vega-runtime only).
- U9 (#695) touched `src/app/app.tsx`, `src/state/{dataset,interactivity}.ts`, `src/lib/interactivity/*`, `src/lib/vega-embed/cross-filter-expressions.ts`, and **added `src/__test__/setup.ts` + `setupFiles` in `vitest.root.config.ts`**. U18 will also touch `src/app/app.tsx`; U14 will touch app-core visual-viewer (also touched by U8 #694). Same additive pattern.

**Post-merge simplification (2026-07-09):** U1–U6 are all in `next`. Every remaining unit now branches directly off `origin/next` — no stacked PRs remain (U3's parent U2 and U5/U7/U8's parent U4 are all merged). Surviving order constraints: U6 before U8 and U6 before U18 (both satisfied by sequence; U6 now merged anyway).

All four PRs were test-green at commit time (root suite + all package suites + tsc + eslint). Baseline at `origin/next` (316f97c8) was fully green before work began.

## Execution mode (user-confirmed — do not renegotiate)

- **Per-unit branches + PRs against `next`** (never `main`). Stacked branches when a unit depends on an unmerged parent: U5/U7/U8 stack on `feat/audit-u4-lifecycle-harness`; everything else branches from `origin/next`.
- Branch naming: `fix|feat/audit-uN-<slug>`. One conventional commit per unit (body cites audit finding IDs + plan unit; ends with the model's Co-Authored-By footer). PR body: What/How/Tests + program footer (`Part of the 2026-07-03 audit remediation program (unit UN of 18; prior PRs …)`) + the Claude Code attribution line. Stacked PRs open against the parent branch with a retarget note.
- **Serial subagent per unit** in the shared working tree (per-unit branches make parallel dispatch unsafe without worktrees, and worktrees lack node_modules here). Subagent contract: read the plan's unit section; NO git commands; implement + tests; run the verify gate; report files/results/contradictions. The orchestrator reviews the diff, re-runs tests, commits, pushes, opens the PR.
- **Verify gate per unit:** `npm run test:root`, `npm run test`, `npx tsc --noEmit`, `npm run eslint` — all green before commit. Stage explicit paths only (never `git add .` — the untracked docs must stay untracked).

## Remaining units — order and stacking

Recommended order: **U5 (stack on U4) → U6 (off next) → U7 (stack on U4) → U8 (stack on U4; note U6-first prose ordering) → U9 → U10 → U11 → U12 → U13 → U14 → U15 → U16 → U17 → U18** (all off `origin/next` unless noted). The plan's per-unit sections carry goals, files, approach, test scenarios, and verification — they were revised post-review and are trustworthy; in particular U5's safety-net-terminal-close requirement and U2's two-class registry design were corrected during review and are already reflected in the plan text.

## Execution facts discovered so far (not in the plan)

1. **U1↔U3 textual merge conflict is expected** in `src/lib/dataset/processing.ts` — semantically compatible (U1's `legacy ? false : …` derivation survives; the `legacy` variable keeps its name in U3's rewrite). Merge either order; resolution is mechanical. Nuance: in the M10 split-state re-migration pass, `legacy` is false, so U1's derivation reads the store value once before the stamp pins `false`.
2. **U2's registry contract** (consumed by U3, relevant to any future migration work): `src/lib/persistence/state-management-migration.ts` — `isStateManagementMigrationPending(id, version, {hasProjectContent})`, `getStateManagementVersionToStamp(id)`, `SUPPORT_FIELD_LEGACY_MIGRATION_ID`; version stamp is `denebMetaVersion` (no second number); corrupt stamps classify `indeterminate` and fail safe.
3. **`test:root` is now in the turbo pipeline** (`//#test:root` root task, `test.dependsOn`) — `npm run test` covers root tests locally and in CI. Root test files must match `src/**/__test__/**/*.test.ts` and declare `// @vitest-environment node` docblocks when they need node (jsdom is the root config default). U5's harness scenarios go in `src/__test__/harness/`.
4. **Harness internals** (U5/U7/U8 build on this): `src/__test__/harness/` — `fake-visual-host.ts` (recording eventService + scriptable fetchMoreData), `update-cycle-driver.ts` (transcribes `src/index.ts` update-dispatch glue with per-block source pointers — a deliberate mirror; keep in sync if index.ts changes), `fixtures.ts` (all five documented host quirks), `mock-dataset-slice.ts`. Coordinator attaches via existing DI seams; no production seam changes were needed.
5. **Pre-existing prettier drift on `next`:** `npm run prettier-check` fails on 10 files nobody in this program touched (`src/index.ts`, `pbiviz.json`, dev-overlay/tally files). Do NOT fix inside units; it needs its own tiny PR or a maintainer decision. Surfaced to the user 2026-07-06.
6. **Durable-error channel** (established in U3, reuse in U7/U8/U14): `compilation.durableErrors/durableWarnings` in app-core survive recompile and merge into runtime errors/warnings; message hygiene rule — generic + localized, never raw exception text or payload (i18n keys added: `Text_Error_Dataset_Mapping_Failed`, `Text_Warn_Persisted_Property_Unreadable`).
7. **Doc-review FYI leftovers worth honoring during execution:** U18's `deneb-platform-provider.tsx` real path is `packages/app-core/src/components/deneb-platform/components/`; U10 is effectively *package*-coupled to the 2.0 cut (land before the first certified packaging run); idea #5d (ownership registry) is out of scope for U11.
8. **L4 is REQUIRED, not hygiene (U6 finding, carry into U18).** Verified against `node_modules/vega-view`: `finalize.js` stops timers + DOM listeners + event-stream handlers but NEVER walks operators; signal/data listeners live on `operator._targets` (`View.js` `addOperatorListener`) and survive `finalize()`. So `signal-value.tsx` (L4) removing a listener against the *current* view no-ops after a view swap while the old view keeps the listener — U18's L4 must capture the originating view and remove against it. This is a correctness fix.
9. **`@deneb-viz/vega-react` is not linted in CI (U6 finding, fold into U11):** the package has no `eslint` task and the root eslint config ignores package files. U11's contract-canary scope should cover this gap (a package missing its lint task is exactly the kind of silent drift the canary pack targets).
10. **Testing modules that transitively import `@deneb-viz/app-core` (U9 lesson — GREEN LOCAL, RED CI trap):** app-core pulls both the json-processing web-worker bootstrap (`workers/index.ts` builds a `Worker` from a blob URL at import time — jsdom lacks `URL.createObjectURL`/`Worker`) AND `powerbi-visuals-utils-typeutils` (ships extensionless ESM). CI's Node externalizes typeutils and its strict ESM resolver rejects the extensionless import (`Cannot find module .../extensions/arrayExtensions`); it passes locally only on newer Node / a warm Vite optimize cache. **Fix: `vi.mock` the gateways — `@deneb-viz/app-core`, the visual `state` module (`../../state`), and the `../interactivity` barrel (its `tooltip.ts` → `powerbi-compat/formatting` is a third typeutils path) — so the fragile graph never loads.** This is the pattern every other app-core-importing root suite already uses (see `create-slice-sync.test.ts`, `support-field-consolidation.test.ts`). Do NOT try to load the real graph and shim jsdom (the U9 first attempt via a `src/__test__/setup.ts` `setupFiles` shim looked fine locally but died on CI Node). Verify completeness with a throwing `vi.mock('powerbi-visuals-utils-typeutils', () => { throw ... })` probe — if suites still pass, no path imports it.
11. **M4 selector-setter de-async is DONE (U9).** `setSelectors` (`src/state/dataset.ts`) and `setSelectionLimitExceeded` (`src/state/interactivity.ts`) are now sync `() => void`; the only `.then` consumer was `interactivity-manager.crossFilter`, rewritten to async/await with an internal reset-and-re-throw. No M4 remainder carries forward.
12. **Run `ci:local` before proposing each unit's PR (post-U9).** `npm run ci:local` (`bin/ci-local.js`) runs the GitHub `ci` job's checks locally against `.env.ci` (build, validate-packages-sync, validate-config, eslint, prettier [now `--end-of-line auto` so Windows CRLF working trees don't false-fail], test, package). A Claude Code PreToolUse hook (`.claude/settings.json` → `.claude/hooks/ci-local-before-pr.js`, chore PR off `next`) runs it before every `gh pr create` and blocks on failure — the guard that would have caught U9's CI break. Bypass an intentional draft with `CI_LOCAL_HOOK_SKIP=1`. NOTE: local Node here is 24, CI is **Node 22** — `ci:local` won't reproduce Node-version-specific ESM failures, so still prefer the mock pattern in fact #10 over environment shims.

## Standing constraints (from CLAUDE.md, plan R9, and memory — non-negotiable)

- `SAFETY_NET_BOUND_MS` stays ≤ 10_000 (cert ceiling; U5 changes tick *semantics*, never the bound).
- Never touch `.env`, `package-alpha`/`package-beta` scripts, or wire `validate-config-for-commit` into them.
- vega-embed `actions: false` double-layer workaround stays.
- `@deneb-viz/json-processing` gets no new public surface — move code OUT (U15/U16/U17).
- app-core layering boundaries enforced by eslint + canary; no `console.error` on certified paths.
- Never commit the untracked docs (`docs/rubric.md`, `docs/audit-*.md`, `docs/ideation/`, both plan-adjacent docs).

## Program status — all 18 units shipped (2026-07-12)

U1–U17 merged to `next` (+ perf #701). **U18 shipped as open PR #706** (`fix/audit-u18-async-hardening`) — the final unit: async & hardening guards L1/L2/L4/L8/L9/L10, each with a failing-before/passing-after test (pure helpers / dep-array characterization — app-core has no RTL). Once #706 merges, the **18-unit 2026-07-03 audit remediation program is complete**.

U18 resolved the two residual UNVERIFIED items defensively: **L4** — the signal listener now detaches from the view captured at effect entry (extracted `attach/detachSignalListener` in `signal-viewer/signal-listener.ts`), so correctness no longer depends on what vega `finalize()` neutralizes; **L10** — `http:`/`https:` are allowlisted (`is-http-uri.ts`) before `host.launchUrl` regardless of host scheme handling. Any audit LOW findings not mapped to a unit (see `docs/audit-findings.md`) remain as future triage, not regressions.

### U18 facts for future units
- **`src/app/download-permission.ts` `resolveDownloadPermitted(exportStatusThunk, allowedStatus)`** — deny-by-default async wrapper (thunk + sentinel args so it imports neither `powerbi-visuals-api` nor needs its mock; typed `PromiseLike<T>` because the host's `exportStatus()` returns powerbi's `IPromise`, not a `Promise` — a mismatch only the production type-check catches, not vitest).
- **`getRestrictiveVegaLoader()` (`visual-viewer/components/restrictive-loader.ts`)** is the fail-closed default when `vegaLoader` is absent (data: URIs only). `vega-embed.tsx` uses `vegaLoader ?? getRestrictiveVegaLoader()`. The web-client-sample supplies no loader and now rides this default; it uses inline data so it's unaffected.
- **`getNewUuid()` now prefers `crypto.randomUUID()`** with a Math.random v4 fallback; test the fallback via `vi.stubGlobal('crypto', {})`.
- **Cert lint `powerbi-visuals/no-http-string`** rejects literal `http:` strings — use a regex (`/^https?:$/`) for scheme checks, and a scoped `eslint-disable` for any deliberate `http://` test input.

### U17 facts for future units
- **`spinButtonStyleSlots` is a shared app-core barrel export** (`features/settings-pane/styles.ts`), spread into both the app-core settings pane and the root `src/features/settings/styles.ts`. griffel runs at RUNTIME here (no `@griffel/webpack-loader`), so spreading a shared style fragment into `makeStyles` is safe; type it `satisfies Record<string, GriffelStyle>` to keep literal types without widening `flexDirection` etc. to `string`.
- **`getStandardBarDataset({ interactive })`** (`catalog/standard-bar-dataset.ts`) is the single source for the included bar templates' dataset, kept a **leaf module** (imports only data-core) on purpose: the template files call it at module-init, and routing it through `catalog/index.ts` (which imports `./vega`+`./vega-lite`) would be a circular-init TDZ trap. Any new shared catalog helper called at module-init must stay a leaf, off the barrel.
- **Shared json-processing test fixtures live at `src/__test__/fixtures.ts`** (`TRACKED_FIELDS_NO_REMAP_PENDING`, `TRACKED_FIELDS_REMAP_PENDING`), imported by the field-tracking + tokenizer suites. The remapping/template-usermeta fixtures are NOT identical (verified by value-hash) and stay inline — don't force-share them.
- **`getRemappedSpecification` → `requestRemappedSpecification`** for the app-core async worker wrapper. The json-processing sync worker-side `getRemappedSpecification` keeps its name; two same-named exports with different semantics were the D6 hazard.

### U16 facts for future units
- **P5-E9/E10 resolved as KEEP** — not dead. `object.ts` `DeepValue`/`DeepUpdate`/`StringifyOptions` are the signature types of exported `updateDeep`/`getPrunedObject`/stringify helpers; `UsermetaDeneb` is a field of the template-schema interface + part of the generated-JSON-schema surface (out-of-repo template tooling). Deliberate public surface — do not re-flag as dead.
- **P5-E3 nuance:** `registerCurrentPalette`/`getVegaSchemesPowerBi` are NOT dead — consumed cross-file by `scheme/index.ts`. Only `getNamedColors` (same-file use) was over-exported. The audit's "definition-only" wording was imprecise; trust the grep, not the label.
- **powerbi-compat `./signals` subpath is gone** — the whole dead subpath (+ its exports-map entry + the `pbiContainer` constants copy) was deleted. The live container-signal migration lives in vega-runtime (`signals/migration.ts`, `deneb-container.ts`). The DEPRECATIONS ledger shim row was updated to reflect the removal.
- **Un-exporting a same-file type is declaration-safe:** a non-exported type alias used in an exported function's signature emits as a local `declare type` in the `.d.ts` — no TS4023 (that error is only for types from *other* modules). So the `TBase64DataEncoding` un-export was safe even though it types exported functions.

### U15 facts for future units
- **`@deneb-viz/utils/jsonc` is the canonical JSONC strip+parse-with-result core** (`stripJsoncComments`, `parseJsoncWithResult`, `JsoncParseResult`). vega-runtime's `parseJsonWithResult` (adds line numbers) and json-processing's `getJsonPureString` are thin decorators over it — reuse it for any new JSONC parsing. utils now depends on `jsonc-parser` (^3.3.1).
- **`stripComments` (jsonc-parser) preserves NEWLINES, not exact char length.** The space-replacement keeps line numbers aligned for error reporting, but the stripped string can differ in total length (observed +1). Assert newline count, not length, in tests.
- **Adding a new utils subpath:** add to `packages/utils/package.json` `exports` (alphabetical) + declare any new dep; consumers resolve `@deneb-viz/utils/<sub>` via the exports map → `dist`, so utils must be BUILT before they type-check. Turbo handles order in a full build; for focused local test runs, `npx turbo build --filter=@deneb-viz/utils --filter=<consumer>` first.

### U13 facts for future units
- **Two dataset value paths exist.** The legacy flat-entries builder `getDatumValueEntriesFromDataview` in `src/lib/dataset/values.ts` (consumed by `processing.ts:243`) was the M9 crash site. The newer data-core support-field engine (`support-field-provider.ts` + `build-data-row.ts`) already guards highlights per-column and casts formatStrings honestly — so it needed no change. Know which path you're touching.
- **Testing `values.ts` needs the fact-#10 mock set:** `../interactivity`, `@deneb-viz/powerbi-compat/formatting`, `../data-view`, `../fields`, `@deneb-viz/utils/logging`, and `powerbi-visuals-api` → `{}`. See `src/lib/dataset/__test__/values.test.ts` for the pattern.
- **`PrimitiveValue` (data-core) = `string | number | boolean | Date`** — no null/undefined — but Power BI sends both at runtime (null for un-highlighted rows, undefined for an OOB read of a short highlights array). `highlight.ts` compares against them anyway; that runtime/type gap is intentional, not a bug.
- **`getValueFormatter` is now exported from `@deneb-viz/powerbi-compat/formatting`** (returns the formatter; `getFormattedValue` delegates to it). PR #701 memoises formatters by format string in `getFormattingStringValueEntries` (the row hot path — `getFormattedValue` was creating a fresh Power BI `valueFormatter` per row). The same per-row `getFormattedValue` in `support-field-provider.ts` / `build-data-row.ts` (the newer engine) is NOT yet memoised — a candidate if profiling flags it.

### U12 facts for future units
- **`docs/DEPRECATIONS.md` is the checked-in shim/deprecation ledger** (a committed U12 deliverable — NOT one of the untracked planning docs). Any new `@deprecated` symbol or version-gated compat shim must get a row; convention is 2.0 deprecations → removal candidate at 3.0. The two `@deprecated` JSDoc tags in `vega-runtime/src/lib/signals/{deneb-container,migration}.ts` now carry `Removal target: 3.0` + a ledger pointer.
- **`data_drilldown` decision = SHIP in a 2.x release** (user roadmap call, 2026-07-12). The flag stays off and the scaffolding stays. **Cleanup units must NOT remove drilldown scaffolding** (`src/lib/dataset/drilldown.ts`, processing.ts gates, `TrackedDrilldownProperties` field-tracking, `__drilldown(_flat)?__` expressions) — it is parked-for-ship, not dead. U16 respected this; U17 must too.
- **powerbi-compat `./signals` subpath (incl. the dead `container: 'pbiContainer'` copy) was REMOVED in U16** (#704); the DEPRECATIONS signal-shim row location cell was updated. The live signal migration remains in vega-runtime.

### U11 facts for future units
- **Invariant canaries live at `src/__test__/invariants/`** (run by `test:root`; node env via `// @vitest-environment node` docblocks). Shared `_packages.ts` helper: `listWorkspacePackages()` + `isCodePackage()` (= "has a `build` script", which cleanly separates the 9 code packages from the 2 tooling packages eslint-config/typescript-config). New package-shape contracts should extend these rather than re-globbing.
- **Singleton contract is now enforced**: powerbi-compat must be `peerDependency`-only for every consumer (vega-runtime, template-usermeta, json-processing, app-core) and appear in the tsup `external` of every tsup-bundled consumer (json-processing, app-core; the tsc-built ones don't bundle). Adding a new powerbi-compat consumer without this pairing fails `package-singleton-contract.test.ts`.
- **vega-react is now linted** (has `eslint` script + `eslint.config.js` mirroring vega-runtime's `base.js` spread). Its lint currently emits 22 `only-warn` warnings (all in `use-vega-embed.test.tsx`: `no-explicit-any` + one unused import) — informational, not gating. A future cleanup could tighten these, but base config downgrades everything to warnings so CI won't enforce it.
- **Still-open gaps NOT closed by U11** (deferred as unsafe/out-of-scope): (a) root `prettier-check` still only globs `{src,spec,style}/**` + root `*.{json,md}` — widening to `packages/**` would light up the pre-existing drift (fact #5), so it needs its own decision, not a canary; (b) `bin/**` type-checking still only runs through `ts-node` at validate time. Both remain future-PR candidates.

### U10 facts for future units
- Root vitest now covers `bin/**/__test__/**/*.test.ts` (added to `vitest.root.config.ts` include). Build-script logic that needs testing should be a pure, side-effect-free export (see `bin/config-validation.ts`, split out of the `validate-config-for-commit.ts` CLI) so it can be imported without triggering `dotenvx`/`process.exit`.
- `parseLogLevel(input, fallback)` types `fallback` as the (non-exported) `LogLevel` enum, so only `0` is assignable as a numeric literal — passing any other bare number (e.g. a `-1` sentinel) is a `TS2345`. Pass `0` or an actual level.
- Runtime logging is now fail-closed: absent/empty/garbage `LOG_LEVEL` ⇒ `NONE`. `.env.ci` pins `LOG_LEVEL=NONE`; the validator fails loud if it's missing/non-zero.
