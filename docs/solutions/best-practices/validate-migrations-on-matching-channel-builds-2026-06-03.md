---
title: 'Smoke-test property-migration code paths on matching-channel builds, not by swapping a prod-GUID visual into a dev build'
date: 2026-06-03
category: best-practices
module: persistence, migration, packaging
problem_type: best_practice
component: tooling
severity: high
applies_when:
    - Validating any code path in `src/lib/persistence/migration.ts` (or anything else that reads `dataView.metadata.objects` for the visual's own persisted settings) against a "prior-version visual being opened in a newer build"
    - The prior version is from a different packaging channel than the build being tested — most commonly a certified AppSource (`prod`) build vs. a dev / alpha / beta build
    - The test scenario depends on persisted formatting model state — `developer.versioning.version`, `vega.output.version`, `vega.interactivity.enableContextMenu`, anything else stored under the `objects` bag
    - Symptoms could plausibly be attributed to a code defect (e.g. `isUnversionedSpec: true`, `previousDenebVersion: null`, "migration didn't fire")
tags:
    - power-bi-host
    - visual-guid
    - persistence
    - migration
    - packaging
    - certified-build
    - alpha
    - beta
    - smoke-test
    - test-methodology
related_components:
    - development_workflow
    - persistence
---

# Smoke-test property-migration code paths on matching-channel builds, not by swapping a prod-GUID visual into a dev build

## Context

Power BI keys persisted `objects` (the formatting model bag — version stamps, every `enable*` toggle, anything else stored via `IVisualHost.persistProperties`) to the visual's class GUID. Deneb's packaging modes emit different GUIDs:

| Mode       | GUID prefix                                  |
| ---------- | -------------------------------------------- |
| Certified  | `deneb7E15AEF80B9E4D4F8E12924291ECE89A`      |
| Alpha      | `ALPHAdeneb7E15AEF80B9E4D4F8E12924291ECE89A` |
| Beta       | `BETAdeneb7E15AEF80B9E4D4F8E12924291ECE89A`  |
| Standalone | unrelated dev GUID configured per workspace  |

(See `bin/package-custom.ts` and the channel-specific scripts under `package.json` for the authoritative prefix mechanism.)

When a report contains a visual authored on one GUID and the developer drops in a `.pbiviz` with a different GUID (the typical "let me load this in Desktop alongside my dev build" workflow), Power BI treats them as two distinct visual classes. The persisted `objects` for the original GUID are **not** carried over to the new GUID — the developer sees the new visual rendered with an effectively empty `dataView.metadata.objects` for everything that lives under the formatting model.

The spec / config strings travel because they're stored in the dataView differently, so the visual still _renders_ its content. That makes the failure mode subtle: the visual looks broadly correct (right spec, right data), but every formatting-pane setting reads as default and every `developer.versioning.version` / `vega.output.version` stamp reads as `null` / empty.

## Why this matters

The persistence-suppression and in-memory migration paths added in PR #688 (U5: read-mode property-migration gate) were initially smoke-tested by opening a prod-channel certified 1.9 `.pbix` in a freshly-built 2.0 dev build with `PBIVIZ_DEV_FORCE_READ_MODE=true`. The diagnostic log emitted:

```
[migration] applyRuntimeAffectingMigrationsInMemory entry
{provider: 'vegaLite', isUnversionedSpec: true, previousDenebVersion: null,
 previousProviderVersion: '6.4.1', currentDenebVersion: '2.0.0...'}
```

This looked like a real migration bug — the code took the `isUnversionedSpec === true` branch and skipped the legacy `enableContextMenu` remap entirely. Several minutes of investigation went into proposing a fix for `migrateUnversionedSpec` to extend it with the same context-menu remap logic.

Re-running the same scenario as a **beta-channel** 1.9 `.pbix` against a **beta-channel** 2.0 build (`npm run package-beta` on both) produced the correct log:

```
[migration] applyRuntimeAffectingMigrationsInMemory entry
{provider: 'vegaLite', isUnversionedSpec: false,
 previousDenebVersion: '1.9.0.20260301#a3d2194f', previousProviderVersion: '6.4.1',
 currentDenebVersion: '2.0.0.20260603#d6fd6106'}
[migration] applyRuntimeAffectingMigrationsInMemory changeType {changeType: 'increase'}
[migration] applyContextMenuRemapInMemory {..., versionGateOpen: true,
 enableContextMenuBefore: false, enableContextMenuSelectorBefore: true}
[migration] applyContextMenuRemapInMemory: remap APPLIED in-memory
[context-menu] isContextMenuEnabled read {enableContextMenu: true, ..., result: true}
```

The migration code was always correct. The first symptom was a deployment-channel artifact — the certified-channel persisted properties weren't visible to the beta/alpha GUID — not a code bug.

## Rule

For any future migration-path validation:

1. **Build the prior version in the same packaging channel as the build under test.** Beta → beta. Alpha → alpha. Never prod-`.pbix` → alpha-build.
2. The repo's packaging scripts already make this easy: `npm run package-beta` produces a beta-channel `.pbiviz`; check out the prior tag, run the same command, save the resulting `.pbix` as your migration fixture, then return to the dev branch and re-run `package-beta` for the build under test.
3. **Treat `previousDenebVersion: null` on the first update of a swapped-GUID visual as a deployment artifact until proven otherwise.** Confirm by inspecting the GUID prefix in the bundle filename (`BETAdeneb...js` vs `deneb...js`) before assuming a code defect.

## What this rule does not cover

This is specifically about the formatting-model `objects` bag (everything under `dataView.metadata.objects.<objectName>.<propertyName>`). Cross-GUID data carryover for fields/measures/category bindings is governed by Power BI's separate dataView wiring and is not in scope here.

## Cross-references

- The U5 implementation: [src/lib/persistence/migration.ts](../../../src/lib/persistence/migration.ts) (`handlePropertyMigration`, `applyRuntimeAffectingMigrationsInMemory`)
- The dev-only override that motivates this kind of local smoke-test: `PBIVIZ_DEV_FORCE_READ_MODE` env flag in [src/lib/state/display-mode.ts](../../../src/lib/state/display-mode.ts) and [docs/DEVELOPMENT.md](../../DEVELOPMENT.md)
- The packaging-mode/GUID-prefix mechanism lives in [webpack.common.config.js](../../../webpack.common.config.js) under the `_DEBUG` / channel-prefix library naming
