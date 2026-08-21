---
date: 2026-08-21
topic: compact-jsonc-formatting
issue: 578
target: 2.1
---

# Compact JSONC Formatting

## Summary

Replace the verbose, one-value-per-line JSON formatting that Deneb applies today (jsonc-parser `format()`) with a comment-preserving compact formatter that packs short objects and arrays onto a single line, Vega Editor style. The maximum line length is a new user setting (`formattingMaxLineLength`, default 80, range 40–200) in the Advanced editor → JSON editor property group. The formatter is applied everywhere Deneb formats spec/config text: the editor's Format Document command, a new Format Selection capability, and template import/export. No new dependencies.

---

## Problem Frame

Issue #578: users find Deneb's formatted specs long and hard to read compared to Vega Editor, and round-trip through Vega Editor to get compact output. Vega Editor uses `json-stringify-pretty-compact` (`maxLength`-aware) but strips comments to do so; Deneb moved to jsonc-parser's `format()` in 1.7 to support comments, and that API exposes no line-length control (its options are `tabSize`, `insertSpaces`, `eol`, `insertFinalNewline`, `keepLines`). The Monaco JSON worker formats via the same library, so there is no configuration-only fix.

What has changed since the issue was triaged: jsonc-parser exposes a full AST with source offsets (`parseTree`), comment locations (`visit({ onComment })`), and node lookup (`findNodeAtOffset`). That is enough to implement the pretty-compact algorithm directly over JSONC, preserving comments, in a self-contained function. Monaco allows the worker's formatter to be disabled (`setModeConfiguration`) and replaced with a registered provider.

---

## Requirements

### R1 — Compact formatter (`@deneb-viz/utils`)

Add to `packages/utils/src/lib/jsonc.ts`:

```ts
export interface JsoncCompactFormatOptions {
    tabSize: number;
    maxLineLength: number;
}
export interface JsoncTextEdit {
    offset: number;
    length: number;
    content: string;
}
export const formatJsoncCompact = (
    content: string,
    options: JsoncCompactFormatOptions
): string;
export const formatJsoncCompactRange = (
    content: string,
    range: { offset: number; length: number },
    options: JsoncCompactFormatOptions
): JsoncTextEdit | undefined;
```

`formatJsoncCompact` is `formatJsoncCompactRange` applied to the root node, with the edit applied. Both are pure functions of their inputs.

**Algorithm**

1. `parseTree(content, errors)`. If `errors` is non-empty or there is no root node, the document is returned unchanged (`formatJsoncCompactRange` returns `undefined`). Broken JSON is never reformatted.
2. Collect comments with `visit(content, { onComment })` as `{ offset, length, text }`. Each comment is attached to a node:
   - **Leading** — the comment precedes a node's first token (on an earlier line or the same line before it): attached to that node, emitted on its own line(s) above the node at the node's indent.
   - **Trailing** — the comment sits on the same line as the end of a preceding value/property: attached to that node, emitted after the node (and its comma, if any) on the same line.
   - Comments after the last token of the document are emitted at the end, each on its own line.
   - Block comments (`/* */`) spanning multiple lines have their inner lines re-indented to the current indent. Line comments (`//`) and single-line block comments are emitted verbatim.
3. `render(node, depth)`:
   - **Scalars** (`string`, `number`, `boolean`, `null`): the raw source slice `content.substr(node.offset, node.length)`. This preserves `1.0`, `1e3`, unicode escapes, and any other lexical detail `JSON.parse` would normalise away.
   - **Property**: `render(key) + ": " + render(value)`.
   - **Object / array**: attempt the flat form first — `{"a": 1, "b": [1, 2]}` / `[1, 2, 3]` (a space after `:` and after `,`, no padding inside braces/brackets — matches `json-stringify-pretty-compact`). Accept the flat form when `depth * tabSize + prefixLength + flat.length <= maxLineLength` **and** no comment is attached to any node in the subtree. `prefixLength` is the length of the `"key": ` prefix when the container is a property value, otherwise 0. Otherwise render expanded: opener, each child on its own line at `depth + 1`, comma separators, closer at `depth`.
   - Empty containers render as `{}` / `[]`.
4. Output uses `\n` line endings, `tabSize` spaces per indent, and no trailing newline (matches the current `getTextFormattedAsJsonC` output shape).

**Range formatting**

1. Locate `findNodeAtOffset(root, range.offset)` and `findNodeAtOffset(root, range.offset + range.length)`; walk `.parent` to their nearest common ancestor. If the ancestor is a property's key or value, use the whole `property` node. This is the smallest complete node containing the selection.
2. Depth is structural: the count of `object`/`array` ancestors above the node. Existing whitespace is not consulted.
3. Render that node at that depth, bounding comment collection to its span, and return a single edit covering exactly `[node.offset, node.offset + node.length)`.

### R2 — Setting: `formattingMaxLineLength`

| Layer | Change |
| --- | --- |
| `capabilities.json` | `objects.editor.properties.formattingMaxLineLength`, type `numeric` |
| `src/lib/persistence/model/settings-editor.ts` | `NumUpDown`, min 40 / max 200 / default 80, in the JSON editor group (alongside font size, word wrap, line numbers) |
| `stringResources/en-US/resources.resjson` | `Objects_Editor_FormattingMaxLineLength` ("Max line length when formatting") and `_Description` |
| `packages/configuration/src/index.ts` | `EDITOR_DEFAULTS.formattingMaxLineLength: { default: 80, min: 40, max: 200 }` |
| `src/lib/state/editor-preferences-sync-mappings.ts` | Map to new slice key `jsonEditorFormattingMaxLineLength` |
| `packages/app-core/src/state/editor-preferences.ts` | Add `jsonEditorFormattingMaxLineLength: number` to `EditorPreferencesSliceProperties` and the initial state |

Pattern is identical to `debouncePeriod`; no new UI beyond the formatting-pane property.

### R3 — Monaco integration (`packages/app-core/src/lib/monaco/editor-init-service.ts`)

1. `monaco.languages.json.jsonDefaults.setModeConfiguration({ ...defaults, documentFormattingEdits: false, documentRangeFormattingEdits: false })`. All other worker features (diagnostics, completions, hover, folding, selection ranges, colors, tokens) remain enabled — the configuration must spell them out as `true` because `setModeConfiguration` replaces the whole object.
2. Register `monaco.languages.registerDocumentFormattingEditProvider('json', …)` and `registerDocumentRangeFormattingEditProvider('json', …)`. Both:
   - read `tabSize` from `model.getOptions()`,
   - read `maxLineLength` from `getDenebState().editorPreferences.jsonEditorFormattingMaxLineLength` at invocation time (so changing the property takes effect on the next format without re-registration),
   - return `[]` when the formatter returns the content unchanged / `undefined`,
   - are tracked as disposables (same pattern as `completionProviderDisposable`) so a retried initialisation does not stack providers.
3. Replace the `Ctrl+Alt+R → editor.action.formatDocument` keybinding with a registered command `deneb.formatDocumentOrSelection`: if the editor's selection is non-empty, run `editor.action.formatSelection`; otherwise `editor.action.formatDocument`. Monaco's context menu will additionally surface **Format Selection** automatically whenever a range provider is registered and a selection exists.
4. `plaintext` editors (cell inspector scalar view) are unaffected; providers are language-scoped to `json`.

### R4 — Call sites

- `getTextFormattedAsJsonC(content, tabSize, maxLineLength = EDITOR_DEFAULTS.formattingMaxLineLength.default)` in `packages/json-processing/src/processing.ts` delegates to `formatJsoncCompact`. Existing two-argument callers keep working; no new public surface is added to `json-processing` (the package is slated for dissolution — the helper is retained only as a delegating shim).
- Template export (`packages/json-processing/src/template-usermeta.ts`, three sites) and template/spec import (`import-dropzone.tsx`, `select-included-template.tsx`) pass the user's `jsonEditorFormattingMaxLineLength` where the app-core store is reachable; `json-processing` internals use the default.

### R5 — Documentation: formatting behaviour & quirks

A section for the user docs (deneb-viz.github.io) and `docs/DEVELOPMENT.md`, covering:

- **Compaction rule** — a container is written on one line when it fits within the max line length (including its indent and key) and contains no comments; otherwise one child per line. Nested containers are decided independently, so a long array inside a short object expands while sibling values stay compact.
- **Comments force expansion** — any comment inside a container expands that container (and every ancestor). Leading comments go on their own line above the value; same-line trailing comments stay on the line.
- **Range formatting snaps outward** — formatting a selection reformats the smallest complete value or property that contains the selection. Selecting three properties inside `"encoding"` reformats the whole `"encoding"` object.
- **Invalid JSON is left untouched** — formatting does nothing until parse errors are resolved.
- **Layout is deterministic** — the user's existing line breaks are not preserved; formatting the same content twice yields identical output.
- **Literals are preserved verbatim** — `1.0` stays `1.0`, escapes are not rewritten.

---

## Testing

**Unit (`packages/utils/src/lib/__tests__/jsonc.test.ts`, vitest)**

- Parity oracle: for comment-free inputs, `formatJsoncCompact(x, { tabSize: 2, maxLineLength: 80 })` equals `json-stringify-pretty-compact`'s `stringify(JSON.parse(x), { indent: 2, maxLength: 80 })` byte-for-byte, across a set of Vega/Vega-Lite fixture specs and edge cases (empty containers, deeply nested, long strings that cannot fit). `json-stringify-pretty-compact` is already a dependency, so the oracle costs nothing.
- Comments: leading line, trailing line, single-line block, multi-line block, comment in an otherwise-fitting container, comment after the last token.
- Literal fidelity: `1.0`, `1e3`, `-0`, `"é"`, strings containing `{`, `[`, `//`, `/*`.
- Invalid JSON: returned unchanged; range variant returns `undefined`.
- Range: selection inside a nested object snaps to that object; selection spanning two siblings snaps to their parent; selection over a key snaps to the property; depth-derived indent is correct for a node three levels deep.
- Idempotence: `format(format(x)) === format(x)` for every fixture.
- `tabSize` 4 produces 4-space indents.

**Existing tests**

- `getTextFormattedAsJsonC` test in `packages/json-processing/src/__test__/processing.test.ts` changes its expectation from the expanded form to `{"name": "John", "age": 30}` — the input fits on one line. This change is intended.

**Manual (Desktop dev build)**

- Ctrl+Alt+R with no selection formats the whole document; with a selection formats the enclosing node only.
- Context menu shows Format Document always and Format Selection when a selection exists; both behave as above.
- Changing `formattingMaxLineLength` in the formatting pane and re-formatting reflects the new width without reloading.
- Export a template; inspect the JSON is compact. Re-import it; the editor shows compact content.
- A spec with comments formats with comments intact and in place.

**Bundle**

- No new dependency; net bundle change expected ≈ 0. The Monaco worker's own formatter code remains in the worker bundle (not tree-shakeable) — accepted.

---

## Out of Scope

- A "never compact" escape hatch (e.g. `0` = disable). The range floor of 40 effectively expands everything but trivial values; a separate toggle can be added later if requested.
- Preserving user line breaks (`keepLines`-style behaviour).
- Format-on-paste / format-on-type.
- Changes to `formatJson` / `getObjectFormattedAsText` in `utils/object.ts` (compiled-Vega pane, inspector popover) — these already use `json-stringify-pretty-compact` on plain objects and are unaffected.

---

## Release

Targeted at **2.1**. The 2.0 certification cut must be taken from `main` (fast-forward `certification` to the chosen commit) **before** this work merges, so that `certification` remains a strict ancestor of `main`. Work stays on a feature branch until then.
