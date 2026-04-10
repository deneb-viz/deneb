# $schema Property Warning + Quick Fix

## Problem

Users frequently copy/paste Vega or Vega-Lite specifications into Deneb's editor that contain a `$schema` property. Since Deneb runs inside Power BI's sandboxed iframe and cannot make external network requests (in certified builds), Monaco attempts to fetch the external schema URL and fails. This breaks auto-completion, validation, and documentation features. Deneb already manages schemas internally via pre-compiled local schemas matched by file URI — the `$schema` property is unnecessary and harmful.

There is currently no feedback to the user when `$schema` is present. The export/import process correctly strips it on import and adds it back on export, but users who paste specs directly get no guidance.

## Solution

Register a Monaco diagnostic marker + code action provider for both the Spec and Config editors. When a root-level `$schema` property is detected in the editor content:

1. A **warning marker** (yellow squiggle) appears on the `$schema` line with a message explaining that Deneb manages schemas internally.
2. A **quick fix** code action is offered that removes the `$schema` property using JSONC `modify` + `applyEdits` (the same pattern used by `getModifiedJsoncByPath` in json-processing).

## Behavior

- **Detection trigger:** Monaco's `onDidChangeModelContent` event on the editor model. Markers are recalculated whenever content changes.
- **Marker severity:** Warning (yellow squiggle, not error).
- **Marker range:** The full extent of the `$schema` property (key + value + surrounding syntax).
- **Code action:** "Remove $schema — Deneb manages schemas internally" (or similar). Applies a JSONC edit that cleanly removes the property, handling leading/trailing commas.
- **Scope:** Both Spec and Config editors.
- **No forced removal:** The property is never auto-removed. The user must explicitly invoke the quick fix.

## Files

| File | Change |
|------|--------|
| New: `packages/app-core/src/lib/editor/schema-property-diagnostic.ts` | Diagnostic marker + code action provider registration |
| Modify: `packages/app-core/src/features/specification-editor/components/specification-json-editor.tsx` | Wire up the diagnostic on editor mount/content change |

## Not In Scope

- Compilation warnings for `$schema` (the Monaco diagnostic is sufficient)
- MessageBar or banner UI (the inline squiggle + quick fix is the chosen approach)
- Automatic removal of `$schema` (explicitly not desired)
- i18n of the diagnostic message (can be added later; hardcoded English for now)
