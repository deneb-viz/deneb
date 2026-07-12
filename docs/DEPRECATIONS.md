# Deneb Deprecations & Shim Ledger

Tracks every `@deprecated` symbol and version-gated compatibility shim carried
into 2.0, together with its lifecycle — so shim lifetimes are tracked facts
rather than folklore, and nothing rides silently into a future major without a
removal decision.

**Convention:** anything deprecated or announced at **2.0** is a **removal
candidate at 3.0** unless a row says otherwise. A _removal target_ is the
earliest release a symbol _may_ be removed — not a promise; removal still
requires confirming no supported specs/persisted payloads depend on it.

**Version source of truth:** `pbiviz.json` (current cut: **2.0**). The next
release is 2.0, not 1.10 — "pre-1.10" targets in older code comments are stale.

---

## Deprecated symbols (`@deprecated`)

| Symbol                                                                             | Introduced | Deprecated since | Removal target | Migration path                                                                                                                                                              | Location                                                    |
| ---------------------------------------------------------------------------------- | ---------- | ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `SIGNAL_PBI_CONTAINER_LEGACY` (`'pbiContainer'`)                                    | < 2.0      | 2.0              | 3.0            | Use `SIGNAL_DENEB_CONTAINER` (`'denebContainer'`). Specs are auto-migrated at parse via `replaceLegacySignalReferences`; a once-per-session console warning nudges authors. | `packages/vega-runtime/src/lib/signals/deneb-container.ts`  |
| `pbiContainerWidth` / `pbiContainerHeight` (`SIGNAL_PBI_CONTAINER_WIDTH/HEIGHT_LEGACY`) | < 2.0  | 2.0              | 3.0            | Use `denebContainer.width` / `denebContainer.height`. Same automatic migration.                                                                                            | `packages/vega-runtime/src/lib/signals/migration.ts`        |

## Version-gated compatibility shims

| Shim                                                                                                       | Purpose                                                                                                                                                                                                      | Introduced | Removal target                                                                     | Location(s)                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy container-signal migration (`replaceLegacySignalReferences`, `logLegacySignalWarning`)              | Rewrites pre-2.0 `pbiContainer*` signal names to `denebContainer.*` when parsing specs / importing templates; warns once per session.                                                                        | 2.0        | 3.0 (tied to the two `@deprecated` rows above)                                     | vega-runtime `signals/migration.ts` (impl); json-processing `template-usermeta.ts:265` (invoked on template import). The dead `container: 'pbiContainer'` copy in powerbi-compat `lib/signals/` (an unconsumed parallel to the live vega-runtime migration) was **removed in U16**, along with the whole `./signals` subpath. |
| Context-menu settings split remap (`CONTEXT_MENU_SPLIT_VERSION = '2.0.0'`, `applyContextMenuRemapInMemory`) | Pre-2.0 visuals had a single `enableContextMenu: false`; 2.0 split it into `enableContextMenu` + `enableContextMenuSelector`. Remaps the old value on upgrade from `< 2.0.0`, both in-memory (read) and persisted. | 2.0        | 3.0 candidate — safe to remove once pre-2.0 persisted payloads are no longer expected in the wild. | `src/lib/persistence/migration.ts`                                                                                                                                                                                                              |
| `isLegacySpec` support-field legacy stamping (`isLegacySpec`, `SUPPORT_FIELD_LEGACY_MIGRATION_ID`)         | Version sniff (`denebMetaVersion < 2`) that stamps legacy support-field defaults into pre-2.0 specs so they keep prior behaviour. Delegates to the migration registry (`isSupportFieldMigrationPending`).      | 2.0        | 3.0 candidate — removable once pre-2.0 specs are migrated / absent.                | `src/lib/dataset/support-field-migration.ts` (thin delegate); `src/lib/persistence/state-management-migration.ts` (registry)                                                                                                                     |

## In-flight feature flags

| Flag             | Status                                                                                                                              | Decision                                                                                                                                                                                                                                                              | Location              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `data_drilldown` | Off (`false`); scaffolding present but incomplete (`template-dataset.ts`: _"to be implemented when drilldown is implemented"_).     | **Ship in a 2.x release** (roadmap decision recorded 2026-07-12). Flag stays off until the feature is finished — this is a forward-looking flag, not a deprecation. Scaffolding: `src/lib/dataset/drilldown.ts`, drilldown gates in `processing.ts`, `TrackedDrilldownProperties` field-tracking (json-processing / app-core), `__drilldown(_flat)?__` expressions. | `config/features.json` |

---

**Checked and _not_ deprecated** (verified during the 2.0 inventory, recorded so
they aren't re-investigated): the version constants `TEMPLATE_USERMETA_VERSION`
(= 2) and `APPLICATION_VERSION` are current-state metadata used when generating
templates / reporting build version — not backward-compat gates.
