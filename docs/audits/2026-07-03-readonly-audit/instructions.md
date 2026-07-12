# Deneb Read-Only Code Audit — Instructions for Claude Code

## Mission
Perform a prioritized audit of the Deneb repository (c:\Repos\deneb) and produce a
findings report. This is a READ-ONLY engagement: you analyze and report; you do not fix.

## Hard constraints (non-negotiable)
- WRITE exactly one file: `docs/audit-findings.md` (the report was filed alongside these instructions at `findings.md`). No other Edit/Write calls, anywhere.
- Do NOT stage, commit, push, branch, checkout, rebase, or reset. Git is read-only
  (`git log`, `git blame`, `git diff` are fine). Never touch the `main` branch.
- Do NOT run `npm install`, `npm update`, `npm audit fix`, or modify any
  package.json, lockfile, tsup/webpack config, or CI workflow.
- Do NOT create, modify, or read-then-suggest-changes-to `.env`. Its flags
  (`ALLOW_EXTERNAL_URI`, `LOG_LEVEL`, dev toggles) are certification-gated.
- Do NOT add dependencies, tools, tests, or scaffolding. If a control is missing,
  that is a FINDING, not a task.
- Allowed commands: `npx tsc --noEmit`, `npm run eslint`, `npm run test`,
  `npm run prettier-check`, `npm ls`, read-only git. Nothing that mutates state.
- No web fetches. Work entirely from the local repo.

## Context you already have (do NOT re-derive; skip any discovery/inventory pass)
- Architecture: read CLAUDE.md and packages/app-core/ARCHITECTURE.md first — they ARE
  the structural map. npm-workspaces monorepo; React 19 + Vega/Vega-Lite Power BI
  custom visual. No server, no routes, no SQL, no JWT, no CORS — skip all
  web-backend audit patterns entirely.
- Intentional code — do NOT flag as defects:
  1. vega-embed workaround: `actions: false` spread at the vegaEmbed() call site in
     vega-react/src/hooks/use-vega-embed.ts PLUS the CSS `.vega-actions` override —
     both layers are required.
  2. The rendering-lifecycle safety-net timeout (≤10s) in src/index.ts.
  3. Legacy migration stamping: pbiContainer→denebContainer signal migration and
     pre-2.0 `stateManagement` defaults stamping.
  4. `@deneb-viz/powerbi-compat` uses tsc (not tsup) and is consumed as a
     peerDependency marked `external` — this is the singleton pattern, not drift.
- Modules that static call-tracing marks "dead" may be consumed via webpack/tsup
  externals or .pbiviz packaging. Report suspected dead code as LOW confidence
  unless you traced the build config too.

## Efficiency protocol (tight usage budget)
1. Cheap signal first: run `npx tsc --noEmit` and `npm run eslint`, triage output.
2. Grep-driven targeting: locate candidates with Grep, read only the enclosing
   function — never whole files when a 30-line window answers the question.
3. Execute passes in priority order below. Time-box each; if budget runs low,
   write the report with completed passes rather than starting the next one.
4. Write findings to the report incrementally so a truncated run still yields output.

## Audit passes (priority order)

### P1 — Async & lifecycle (highest value)
Scope: packages/vega-react/src/hooks, packages/app-core/src (state, features),
src/index.ts, the rendering-lifecycle coordinator.
- Catch blocks that log and return undefined (caller gets no failure signal).
- Un-awaited promises; async work whose result mutates Zustand state after the
  component/view is gone (stale closure writes).
- useEffect / initialization hooks registering listeners, timers, subscriptions,
  or Vega view handlers without a matching teardown.
- Races between Power BI `update()` cycles and Vega view creation/destruction:
  can a second update land while the prior embed is mid-flight? Is there
  cancellation/serialization?

### P2 — Cross-package contracts
- Singleton compliance: for every package importing @deneb-viz/powerbi-compat,
  verify it appears in that package's `peerDependencies` AND its tsup `external`
  array. Any deviation is HIGH.
- app-core layering: spot-check for cross-feature or upward imports the eslint
  boundaries config might miss (dynamic imports, type-only leaks).
- Near-duplicate utilities across packages (same logic reimplemented in two
  packages — divergence risk).

### P3 — Data & logic integrity
Scope: packages/data-core (buildProcessingPlan, buildDataRow, support fields),
dataset mapping in src/, spec parsing in vega-runtime.
- Empty/null/single-row categorical dataview handling end-to-end.
- Return-type consistency: functions returning a typed value on success and
  undefined on failure without the signature saying so.
- Migration idempotency: legacy stamping paths — what happens on second load,
  or when persisted state is partially populated?
- JSONC parse failures: is the error surfaced to the user or swallowed?

### P4 — Security (scoped to what applies here)
- Hardcoded secrets/keys/tokens anywhere in source (grep for key/secret/token/
  password literals). Any hit is CRITICAL.
- Logging leaks: console.log/logger calls on production paths that emit dataset
  contents, PII, or host internals when LOG_LEVEL should gate them.
- Math.random()/Date.now() used for IDs or anything correlation-sensitive where
  the utils crypto module should be used.
- External URI handling: verify runtime paths honor ALLOW_EXTERNAL_URI=false
  (certified mode) — any fetch/image/URL path that bypasses the gate is CRITICAL.
- User-spec injection surface: user-authored JSONC reaches Vega expression
  evaluation — verify expression/signal handling doesn't expose host callbacks
  beyond the intended extensibility surface.
- Dependencies: `npm ls` for resolution errors; flag (report only) any package
  that looks hallucinated/unmaintained. Do not update anything.

### P5 — Quality (flag only; skip entirely if budget is low)
- Duplicated blocks 10+ lines across files.
- Functions with very high branch counts relative to their tests.
- Exported symbols with no references (LOW confidence, see build-config caveat).

## Severity & reporting (report-only — no remediation actions exist in this engagement)
- CRITICAL: secret, external-URI bypass, injection surface — top of report.
- HIGH: swallowed async error on a production path; singleton violation; race.
- MEDIUM: missing teardown; migration non-idempotency; return-type inconsistency.
- LOW: duplication, dead-code candidates, complexity.

Each finding: `file:line` — severity — pass — one-paragraph description — the
traced evidence path (how you confirmed it, not just that it pattern-matched) —
a suggested fix described in prose or a short diff BLOCK inside the report
(never applied). End the report with a "Passes not completed" section if any.

Do not trust appearance of correctness: trace each catch to its resolution and
each async write to its lifecycle owner before reporting. A finding you could
not trace is labeled UNVERIFIED, not omitted.
