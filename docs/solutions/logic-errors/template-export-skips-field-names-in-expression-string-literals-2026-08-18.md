---
title: 'Template export left dataset field names untokenized when used as quoted string literals inside Vega expressions'
date: 2026-08-18
category: logic-errors
module: 'packages/data-core/src/lib/field/tokenization, packages/json-processing/src/lib/spec-processing/workers'
problem_type: logic_error
component: service_object
severity: medium
symptoms:
    - "Exporting a template rewrites `encoding.*.field` references to placeholders (`__0__`, `__1__`) but leaves `\"expr\": \"pluck(data('dataset'), 'CategoryName')[1]\"` untouched, so the exported template still names the original field"
    - 'On template import the expression keeps looking for the original field name while the mapped dataset exposes only the placeholder key — the param silently evaluates to `undefined`'
    - 'Only bare quoted literals are affected; `datum.Field`, `datum[''Field'']`, `datum["Field"]` and `_{Field}_` tokens all export correctly'
    - 'Field tracking correctly records the expression path (it appears in `trackedFields[...].paths`), so the field shows in the export dialog — the gap is purely in tokenization'
root_cause: logic_error
resolution_type: code_fix
related_components:
    - packages/data-core/src/lib/field/tokenization.ts
    - packages/json-processing/src/lib/spec-processing/workers/field-tracking.ts
    - packages/json-processing/src/lib/spec-processing/workers/tokenizer.ts
    - packages/json-processing/src/lib/spec-processing/workers/remapping.ts
tags:
    - field-tracking
    - tokenization
    - template-export
    - placeholder
    - vega-expression
    - regex
    - pluck
---

# Template export left dataset field names untokenized when used as quoted string literals inside Vega expressions

## Problem

Deneb's template export replaces every dataset field reference in the spec with a placeholder (`__0__`, `__1__`, …) so a template can be re-bound to a different dataset on import. Field names passed as plain string arguments to Vega expression functions — the reporter's case was a Vega-Lite `params[].expr` of `pluck(data('dataset'), 'CategoryName')[1]` — were skipped, so the exported template still referenced the original field and broke on import. Reported in [#521](https://github.com/deneb-viz/deneb/issues/521); fixed in [#743](https://github.com/deneb-viz/deneb/pull/743).

## Symptoms

- `encoding.y.field: "CategoryName"` → `"__0__"` in the export, but `"expr": "pluck(data('dataset'), 'CategoryName')[1]"` is unchanged.
- The field *does* appear in the export dialog's dataset list, and the expression path is present in `trackedFields[key].paths` — tracking works, rewriting doesn't.
- No error anywhere; the only signal is a template that yields `undefined` for that param after import unless the user hand-edits `template.json`.

## What Didn't Work

- **Assuming it was a quote-parsing bug** (the issue title suggests single quotes are the problem). Single vs double quotes were irrelevant — `datum['Field']` already worked. The distinguishing factor was *bare literal outside a `datum` accessor*.
- **Looking only at the tracker.** The natural first suspect was `getTrackingDataFromSpecification`, but a scratch test running tracking → tokenization on the repro spec showed the path was tracked and only the tokenizer failed. Instrumenting the two-stage pipeline end-to-end was what localised the fault.

## Solution

Field tracking is a two-stage pipeline:

1. **Tracking** ([field-tracking.ts](../../../packages/json-processing/src/lib/spec-processing/workers/field-tracking.ts)) parses each JSON string as a Vega expression via `vega-expression` and walks the AST; any `Literal` or `Identifier` whose value equals a field name marks the JSON path as a field reference.
2. **Tokenizing** ([tokenizer.ts](../../../packages/json-processing/src/lib/spec-processing/workers/tokenizer.ts)) rewrites each tracked value by running the regex replacers from `getTokenPatterns` in [tokenization.ts](../../../packages/data-core/src/lib/field/tokenization.ts) over the raw string.

Every replacer was `^name$` (whole-value match) or a `datum.` / `datum[...]` / `_{}_` accessor pattern. A quoted literal in any other position matched nothing and passed through silently.

Fix — two least-specific replacers appended to `getTokenPatterns`, guarded by a negative lookbehind so that dataset/scale-name arguments are not mistaken for fields:

```ts
// packages/data-core/src/lib/field/tokenization.ts
const NON_FIELD_ARGUMENT_FUNCTIONS = [
    'data', 'indata', 'modify', 'scale', 'invert', 'copy', 'domain', 'range', 'bandwidth'
];
export const NON_FIELD_ARGUMENT_EXCLUSION =
    `(?<!\\b(?:${NON_FIELD_ARGUMENT_FUNCTIONS.join('|')})\\(\\s*\\\\?['"])`;

// ...appended to getTokenPatterns(), after the datum/_{}_ patterns:
{
    pattern: `${NON_FIELD_ARGUMENT_EXCLUSION}(?<=')(${namePattern})(${alternation})?(?=\\\\?')`,
    replacer: `${placeholder}$2`
},
{
    pattern: `${NON_FIELD_ARGUMENT_EXCLUSION}(?<=")(${namePattern})(${alternation})?(?=\\\\?")`,
    replacer: `${placeholder}$2`
}
```

Behaviour after the fix (from the regression test):

| Input | Output |
| --- | --- |
| `pluck(data('dataset'), 'CategoryName')[1]` | `pluck(data('dataset'), '__dataset.0__')[1]` |
| `pluck(data("dataset"), "CategoryName")[1]` | `pluck(data("dataset"), "__dataset.0__")[1]` |
| `'…\'CategoryName\'…'` (nested-escaped) | `'…\'__dataset.0__\'…'` |
| `'CategoryName__highlight'` | `'__dataset.0____highlight'` |
| `pluck(data('CategoryName'), 'CategoryName')` | `pluck(data('CategoryName'), '__dataset.0__')` — dataset name left alone |
| `indata('CategoryName', 'CategoryName', 1)` | `indata('CategoryName', '__dataset.0__', 1)` — second arg *is* a field |
| `'Sales CategoryName'` | unchanged — lookarounds require the quote to be adjacent |

The optional `\\?` before the closing quote handles literals nested inside another string (`\'Field\'`), which the existing "advanced cross-filtering" patterns also need. The import/remap direction (`remapping.ts`) uses a plain `replaceAll(placeholder, name)` and needed no change.

## Why This Works

The AST-based tracker was generous (any literal equal to a field name); the regex-based tokenizer was narrow (accessors only). Anything the tracker claimed but the tokenizer couldn't rewrite fell into a silent gap. Adding the quoted-literal replacers closes the gap in the direction the tracker already committed to; the `NON_FIELD_ARGUMENT_EXCLUSION` lookbehind then reclaims the one context where a matching literal is *known* not to be a field (Vega functions whose first argument names a dataset or scale). Because the replacers run in precedence order and use adjacent-quote lookarounds, existing datum-accessor output is byte-identical to before (the large tokenizer fixture test still passes unchanged).

Known ceiling: any other quoted string that happens to equal a field name (e.g. `datum.label == 'CategoryName'`) is now tokenized. That is consistent with what tracking already claimed, and export→import is lossless unless the user remaps to a differently-named field. A full fix would tokenize from the expression AST rather than regex, and would remove the need for the function exclusion list — but it is considerably more code and was not warranted for this issue.

## Prevention

- **Test the pipeline end-to-end, not per stage.** A tokenizer test with hand-built `trackedFields` can pass while the real tracker → tokenizer chain fails, and vice-versa. When adding a new expression shape, write the case as tracking → tokenizing on a real spec fragment first (the scratch test that localised this bug took ~30 lines).
- **When adding a tracker match rule, add the matching tokenizer replacer in the same change.** `getTokenPatterns` feeds both `getTokenPatternsLiteral` (tracking) and `getTokenPatternsReplacement` (tokenizing), so shared patterns stay in sync — but the tracker's AST `Literal === fieldName` check has *no* regex counterpart, which is precisely the asymmetry that produced this bug. If that check ever broadens, revisit the replacers.
- **The pinned pattern arrays in `packages/data-core/src/lib/field/__tests__/tokenization.test.ts` use `toEqual`.** Any new replacer must be added there in all three alternation groups (highlight, number-format, parameter). This is intentional friction — it forces a review of ordering, since replacers are applied sequentially with `replaceAll`.
- **Regex escaping through template literals is two-level.** A regex `\\?` (optional literal backslash) is `\\\\?` in a template literal; `\\?` yields a literal `?`. Confirm new patterns against a nested-escaped fixture, not just the plain case.
- Add a case to the `#521` regression test in `tokenizer.test.ts` whenever a new non-field-argument Vega function is discovered (e.g. one whose first string arg is a signal or scale name).

## Related Issues

- [#521](https://github.com/deneb-viz/deneb/issues/521) — the report; the repro comment shows the full before/after template.
- [#743](https://github.com/deneb-viz/deneb/pull/743) — the fix; the `NON_FIELD_ARGUMENT_EXCLUSION` guard was added in response to review feedback about `data('Field')` collisions.
- [#295](https://github.com/deneb-viz/deneb/issues/295) (2023) — earlier instance of the same hazard class in the old Remap dialog: regex substitution of field names inside expression strings without context boundaries (`datum.completionLabel` → `datum['completion']Label`). The Remap dialog was later removed (#486), but the tokenizer inherited the same regex approach.
- [#649](https://github.com/deneb-viz/deneb/issues/649) — Vega-expression placeholder substitution in the cross-filter path (`_{Field}_`); different pipeline, same theme of incomplete regex handling around placeholders.
- [export-dialog-empty-dataset-fields-2026-04-13.md](../ui-bugs/export-dialog-empty-dataset-fields-2026-04-13.md) — the export dialog side of the same field-tracking pipeline (tracked fields → `export.metadata.dataset`); orthogonal bug, useful for the pipeline's history.
- [extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — the general pattern this bug instantiates: two independent interpreters of the same state (AST tracker vs regex tokenizer) drifting apart. This fix hardened one side rather than unifying them; an AST-based tokenizer would be the unifying move.
- No architecture doc currently describes the field-tracking → tokenization → remap pipeline (unlike `packages/data-core/doc/support-fields.md` for the support-field engine). This doc is the first write-up; a dedicated pipeline doc would be a reasonable follow-up.
