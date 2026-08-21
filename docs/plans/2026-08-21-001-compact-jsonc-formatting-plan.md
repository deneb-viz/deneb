# Compact JSONC Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Deneb's verbose jsonc-parser formatting with a comment-preserving, Vega-Editor-style compact formatter, driven by a new `formattingMaxLineLength` editor property, applied to the Monaco Format Document / Format Selection commands and to template import/export.

**Architecture:** A pure formatter in `@deneb-viz/utils` walks the jsonc-parser AST (`parseTree`) and re-emits it using the `json-stringify-pretty-compact` fit rule (render a container on one line if it fits within the max line length and contains no comment; otherwise one child per line). Comments are located with `visit({ onComment })` and attached to the node they precede (leading), the node they follow on the same line (trailing), the container they sit at the end of (inner), or the document tail (after). Range formatting snaps the selection outward to the smallest complete node and renders only that node. `json-processing`'s `getTextFormattedAsJsonC` becomes a delegating shim; Monaco's worker formatter is disabled and replaced with providers that call the new formatter.

**Tech Stack:** TypeScript 5.6, jsonc-parser 3.3.1, monaco-editor 0.46, Zustand, Power BI formatting model, Vitest. No new dependencies.

**Spec:** [docs/brainstorms/2026-08-21-compact-jsonc-formatting-requirements.md](../brainstorms/2026-08-21-compact-jsonc-formatting-requirements.md)

**Branch:** `feat/compact-jsonc-formatting` (already created off `main`; spec is committed there).

---

## Conventions for this plan

- Prettier: 4-space indent, single quotes, no trailing commas, `printWidth` 80. Run `npm run prettier-format` before each commit if unsure.
- Run package tests from the repo root with `npm test -w <package> -- <path>`. Each package's `test` script is `vitest run`, so the trailing path filters to that file.
- `@deneb-viz/app-core` and `@deneb-viz/json-processing` consume `@deneb-viz/utils` from its **built** `dist/`. After changing `packages/utils/src`, run `npm run build -w @deneb-viz/utils` before running tests in dependent packages.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File structure

| File | Responsibility |
| --- | --- |
| `packages/utils/src/lib/jsonc-format.ts` (new) | The compact formatter: comment attachment, flat/expanded rendering, range targeting. Pure functions only. |
| `packages/utils/src/lib/jsonc.ts` | Re-exports the formatter so consumers keep importing from `@deneb-viz/utils/jsonc`. |
| `packages/utils/src/lib/__tests__/jsonc-format.test.ts` (new) | Parity oracle against `json-stringify-pretty-compact`, comment cases, fidelity, range, idempotence. |
| `packages/configuration/src/index.ts` | `EDITOR_DEFAULTS.formattingMaxLineLength`. |
| `packages/app-core/src/state/editor-preferences.ts` | `jsonEditorFormattingMaxLineLength` slice property. |
| `capabilities.json`, `src/lib/persistence/model/settings-editor.ts`, `stringResources/en-US/resources.resjson`, `src/lib/state/editor-preferences-sync-mappings.ts` | Power BI property → formatting pane → store sync. |
| `packages/json-processing/src/processing.ts` | `getTextFormattedAsJsonC` delegates to the formatter. |
| `packages/json-processing/src/template-usermeta.ts` | Threads an optional `maxLineLength` through export/import helpers. |
| `packages/app-core/src/features/project-export/components/export-buttons.tsx`, `.../project-create/components/import-dropzone.tsx`, `.../project-create/components/select-included-template.tsx` | Pass the user's max line length at the three call sites. |
| `packages/app-core/src/lib/monaco/editor-init-service.ts` | Disable worker formatting; register document + range providers; smart Ctrl+Alt+R action. |
| `packages/app-core/src/i18n/en-US.json` | Label for the new editor action (shown in the F1 command palette). |
| `docs/DEVELOPMENT.md` | "JSON formatting" subsection with the behaviour/quirks list. |

---

### Task 1: Formatter core — containers, scalars, fit rule (no comments yet)

**Files:**
- Create: `packages/utils/src/lib/jsonc-format.ts`
- Create: `packages/utils/src/lib/__tests__/jsonc-format.test.ts`

- [ ] **Step 1: Write the failing parity and fidelity tests**

```ts
// packages/utils/src/lib/__tests__/jsonc-format.test.ts
import { describe, expect, it } from 'vitest';
import stringify from 'json-stringify-pretty-compact';
import { formatJsoncCompact } from '../jsonc-format';

const OPTIONS = { tabSize: 2, maxLineLength: 80 };

/**
 * For comment-free JSON, the formatter must match json-stringify-pretty-compact
 * byte-for-byte at the same indent / maxLength. That library is what Vega
 * Editor uses (with defaults: indent 2, maxLength 80).
 */
const expectParity = (value: unknown, maxLineLength = 80, tabSize = 2) => {
    const source = JSON.stringify(value);
    expect(formatJsoncCompact(source, { tabSize, maxLineLength })).toBe(
        stringify(value, { indent: tabSize, maxLength: maxLineLength })
    );
};

const BAR_CHART = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { name: 'dataset' },
    mark: { type: 'bar', tooltip: true },
    encoding: {
        x: { field: 'Category', type: 'nominal' },
        y: { field: 'Sales', type: 'quantitative', aggregate: 'sum' },
        color: {
            field: 'Category',
            type: 'nominal',
            legend: null,
            scale: { scheme: 'tableau10' }
        }
    }
};

describe('formatJsoncCompact — parity with json-stringify-pretty-compact', () => {
    it('matches for a typical Vega-Lite spec', () => {
        expectParity(BAR_CHART);
    });

    it('matches for empty containers', () => {
        expectParity({});
        expectParity([]);
        expectParity({ a: {}, b: [], c: { d: [] } });
    });

    it('matches for arrays of scalars and nested arrays', () => {
        expectParity({ values: [1, 2, 3, 4, 5] });
        expectParity({ matrix: [[1, 2], [3, 4], [5, 6]] });
        expectParity({ long: Array.from({ length: 40 }, (_, i) => i * 1000) });
    });

    it('matches for strings that cannot fit on one line', () => {
        expectParity({
            expr: 'datum.Sales > 100 && datum.Category !== "Other" && datum.Region === "North America"',
            short: 'x'
        });
    });

    it('matches at different max line lengths and tab sizes', () => {
        expectParity(BAR_CHART, 40);
        expectParity(BAR_CHART, 120);
        expectParity(BAR_CHART, 200, 4);
    });

    it('matches for a root-level array and root-level scalar', () => {
        expectParity([{ a: 1 }, { b: 2 }]);
        expectParity(42);
        expectParity('text');
    });
});

describe('formatJsoncCompact — literal fidelity', () => {
    it('preserves number lexemes exactly', () => {
        expect(
            formatJsoncCompact('{"a": 1.0, "b": 1e3, "c": -0}', OPTIONS)
        ).toBe('{"a": 1.0, "b": 1e3, "c": -0}');
    });

    it('preserves string escapes and brace-like characters inside strings', () => {
        const source =
            '{"a": "\\u00e9", "b": "{not json}", "c": "// not a comment", "d": "/* x */"}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });
});

describe('formatJsoncCompact — invalid and empty input', () => {
    it('returns invalid JSON unchanged', () => {
        const broken = '{"a": 1,';
        expect(formatJsoncCompact(broken, OPTIONS)).toBe(broken);
    });

    it('returns empty input unchanged', () => {
        expect(formatJsoncCompact('', OPTIONS)).toBe('');
        expect(formatJsoncCompact('   ', OPTIONS)).toBe('   ');
    });

    it('returns content with a trailing comma unchanged', () => {
        const trailing = '{"a": 1,}';
        expect(formatJsoncCompact(trailing, OPTIONS)).toBe(trailing);
    });
});

describe('formatJsoncCompact — idempotence', () => {
    it('formatting twice yields the same output', () => {
        const once = formatJsoncCompact(JSON.stringify(BAR_CHART), OPTIONS);
        expect(formatJsoncCompact(once, OPTIONS)).toBe(once);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w @deneb-viz/utils -- src/lib/__tests__/jsonc-format.test.ts`
Expected: FAIL — `Cannot find module '../jsonc-format'`.

- [ ] **Step 3: Write the formatter (scaffolded for comments, but comments not yet attached)**

```ts
// packages/utils/src/lib/jsonc-format.ts
import {
    findNodeAtOffset,
    parseTree,
    visit,
    type Node,
    type ParseError
} from 'jsonc-parser';

/**
 * Options for the compact JSONC formatter.
 */
export interface JsoncCompactFormatOptions {
    /** Spaces per indent level. */
    tabSize: number;
    /**
     * A container (object/array) whose single-line form — including its
     * indent, key prefix and trailing comma — fits within this many characters
     * is written on one line. Anything longer is expanded one child per line.
     */
    maxLineLength: number;
}

/** A span of the source text, in character offsets. */
export interface JsoncRange {
    offset: number;
    length: number;
}

/** A replacement for a span of the source text. */
export interface JsoncTextEdit extends JsoncRange {
    content: string;
}

interface JsoncComment extends JsoncRange {
    text: string;
}

/**
 * Where every comment has been attached, keyed by AST node identity.
 *
 * - `leading`: emitted on their own line(s) immediately above the node.
 * - `trailing`: emitted at the end of the node's line (after its comma).
 * - `inner`: inside a container, after its last child, before the closer.
 * - `after`: after the root value, at the end of the document.
 */
interface CommentAttachments {
    leading: Map<Node, JsoncComment[]>;
    trailing: Map<Node, JsoncComment[]>;
    inner: Map<Node, JsoncComment[]>;
    after: JsoncComment[];
}

interface RenderContext {
    content: string;
    root: Node;
    comments: CommentAttachments;
    options: JsoncCompactFormatOptions;
}

const isContainer = (node: Node) =>
    node.type === 'object' || node.type === 'array';

const nodeEnd = (node: Node) => node.offset + node.length;

const contains = (node: Node, offset: number) =>
    node.offset <= offset && offset < nodeEnd(node);

const raw = (ctx: RenderContext, node: Node) =>
    ctx.content.slice(node.offset, nodeEnd(node));

const indentFor = (ctx: RenderContext, depth: number) =>
    ' '.repeat(depth * ctx.options.tabSize);

const bracketsFor = (node: Node): [string, string] =>
    node.type === 'object' ? ['{', '}'] : ['[', ']'];

/**
 * Only horizontal whitespace and at most one comma may sit between the end of
 * a node and a comment for that comment to count as trailing the node.
 */
const TRAILING_GAP = /^[ \t]*,?[ \t]*$/;

const pushTo = (
    map: Map<Node, JsoncComment[]>,
    node: Node,
    comment: JsoncComment
) => {
    const existing = map.get(node);
    if (existing) {
        existing.push(comment);
    } else {
        map.set(node, [comment]);
    }
};

const collectComments = (content: string): JsoncComment[] => {
    const comments: JsoncComment[] = [];
    visit(content, {
        onComment: (offset, length) => {
            comments.push({
                offset,
                length,
                text: content.slice(offset, offset + length)
            });
        }
    });
    return comments;
};

/**
 * Deepest object/array whose span contains `offset`, or `undefined` when the
 * offset lies outside the root value. Property nodes are passed through: an
 * offset between a key and its value resolves to the enclosing object.
 */
const findEnclosingContainer = (
    root: Node,
    offset: number
): Node | undefined => {
    let enclosing: Node | undefined;
    let node: Node | undefined = root;
    while (node && contains(node, offset)) {
        if (isContainer(node)) {
            enclosing = node;
        }
        node = node.children?.find((child) => contains(child, offset));
    }
    return enclosing;
};

/**
 * Attach every comment to a node. Candidates are the children of the
 * container the comment sits in (property nodes for objects, element nodes for
 * arrays), or the root when the comment is outside it.
 */
const attachComments = (content: string, root: Node): CommentAttachments => {
    const attachments: CommentAttachments = {
        leading: new Map(),
        trailing: new Map(),
        inner: new Map(),
        after: []
    };
    for (const comment of collectComments(content)) {
        const enclosing = findEnclosingContainer(root, comment.offset);
        const candidates = enclosing ? (enclosing.children ?? []) : [root];
        const previous = candidates
            .filter((candidate) => nodeEnd(candidate) <= comment.offset)
            .pop();
        const next = candidates.find(
            (candidate) => candidate.offset >= nodeEnd(comment)
        );
        const gapBefore = previous
            ? content.slice(nodeEnd(previous), comment.offset)
            : null;
        if (previous && gapBefore !== null && TRAILING_GAP.test(gapBefore)) {
            pushTo(attachments.trailing, previous, comment);
        } else if (next) {
            pushTo(attachments.leading, next, comment);
        } else if (enclosing) {
            pushTo(attachments.inner, enclosing, comment);
        } else {
            attachments.after.push(comment);
        }
    }
    return attachments;
};

const parseDocument = (
    content: string,
    options: JsoncCompactFormatOptions
): RenderContext | undefined => {
    const errors: ParseError[] = [];
    const root = parseTree(content, errors);
    if (!root || errors.length > 0) {
        return undefined;
    }
    return {
        content,
        root,
        comments: attachComments(content, root),
        options
    };
};

/**
 * Whether any comment is attached inside `node` (its inner comments, or any
 * descendant's leading/trailing comments). The node's own leading/trailing
 * comments do not count — they are emitted by its parent and do not prevent
 * the node itself from being written on one line.
 */
const subtreeHasComments = (ctx: RenderContext, node: Node): boolean =>
    ctx.comments.inner.has(node) ||
    (node.children ?? []).some(
        (child) =>
            ctx.comments.leading.has(child) ||
            ctx.comments.trailing.has(child) ||
            subtreeHasComments(ctx, child)
    );

/**
 * Single-line rendering of `node`, or `null` when a comment anywhere inside it
 * rules that out. Spacing matches json-stringify-pretty-compact: a space after
 * `:` and `,`, none inside the brackets.
 */
const renderFlat = (ctx: RenderContext, node: Node): string | null => {
    if (node.type === 'property') {
        const key = node.children?.[0];
        const value = node.children?.[1];
        if (!key || !value) {
            return raw(ctx, node);
        }
        const flatValue = renderFlat(ctx, value);
        return flatValue === null ? null : `${raw(ctx, key)}: ${flatValue}`;
    }
    if (!isContainer(node)) {
        return raw(ctx, node);
    }
    if (subtreeHasComments(ctx, node)) {
        return null;
    }
    const parts: string[] = [];
    for (const child of node.children ?? []) {
        const part = renderFlat(ctx, child);
        if (part === null) {
            return null;
        }
        parts.push(part);
    }
    const [open, close] = bracketsFor(node);
    return `${open}${parts.join(', ')}${close}`;
};

/**
 * Multi-line block comments have their continuation lines trimmed and
 * re-aligned three columns in from the current indent (under the text that
 * follows the opening `/* `). Single-line comments are emitted verbatim.
 */
const renderComment = (
    ctx: RenderContext,
    comment: JsoncComment,
    depth: number
) => {
    const lines = comment.text.split(/\r?\n/);
    if (lines.length === 1) {
        return comment.text;
    }
    const continuation = `${indentFor(ctx, depth)}   `;
    return [
        lines[0],
        ...lines.slice(1).map((line) => `${continuation}${line.trim()}`)
    ].join('\n');
};

const trailingSuffix = (ctx: RenderContext, node: Node, depth: number) =>
    (ctx.comments.trailing.get(node) ?? [])
        .map((comment) => ` ${renderComment(ctx, comment, depth)}`)
        .join('');

/**
 * Render `node` at structural `depth`. The first line is returned without
 * indent (the caller positions it); continuation lines carry absolute indent.
 * `reserved` is the width already committed on the first line — the `"key": `
 * prefix and the trailing comma — mirroring json-stringify-pretty-compact's
 * fit test.
 */
const renderNode = (
    ctx: RenderContext,
    node: Node,
    depth: number,
    reserved: number
): string => {
    if (node.type === 'property') {
        const key = node.children?.[0];
        const value = node.children?.[1];
        if (!key || !value) {
            return raw(ctx, node);
        }
        const keyPrefix = `${raw(ctx, key)}: `;
        return `${keyPrefix}${renderNode(
            ctx,
            value,
            depth,
            reserved + keyPrefix.length
        )}`;
    }
    if (!isContainer(node)) {
        return raw(ctx, node);
    }
    const flat = renderFlat(ctx, node);
    const indentWidth = depth * ctx.options.tabSize;
    if (
        flat !== null &&
        indentWidth + reserved + flat.length <= ctx.options.maxLineLength
    ) {
        return flat;
    }
    const [open, close] = bracketsFor(node);
    const children = node.children ?? [];
    const inner = ctx.comments.inner.get(node) ?? [];
    if (children.length === 0 && inner.length === 0) {
        return `${open}${close}`;
    }
    const childDepth = depth + 1;
    const childIndent = indentFor(ctx, childDepth);
    const lines: string[] = [open];
    children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        for (const comment of ctx.comments.leading.get(child) ?? []) {
            lines.push(`${childIndent}${renderComment(ctx, comment, childDepth)}`);
        }
        const rendered = renderNode(ctx, child, childDepth, isLast ? 0 : 1);
        lines.push(
            `${childIndent}${rendered}${isLast ? '' : ','}${trailingSuffix(
                ctx,
                child,
                childDepth
            )}`
        );
    });
    for (const comment of inner) {
        lines.push(`${childIndent}${renderComment(ctx, comment, childDepth)}`);
    }
    lines.push(`${indentFor(ctx, depth)}${close}`);
    return lines.join('\n');
};

/**
 * Format a whole JSONC document compactly, preserving comments. Invalid JSON
 * (parse errors, trailing commas) is returned unchanged.
 */
export const formatJsoncCompact = (
    content: string,
    options: JsoncCompactFormatOptions
): string => {
    const ctx = parseDocument(content, options);
    if (!ctx) {
        return content;
    }
    const lines = (ctx.comments.leading.get(ctx.root) ?? []).map((comment) =>
        renderComment(ctx, comment, 0)
    );
    lines.push(
        `${renderNode(ctx, ctx.root, 0, 0)}${trailingSuffix(ctx, ctx.root, 0)}`
    );
    lines.push(
        ...ctx.comments.after.map((comment) => renderComment(ctx, comment, 0))
    );
    return lines.join('\n');
};

const ancestryOf = (node: Node): Node[] => {
    const chain: Node[] = [];
    for (let current: Node | undefined = node; current; current = current.parent) {
        chain.unshift(current);
    }
    return chain;
};

const commonAncestor = (a: Node, b: Node): Node => {
    const chainA = ancestryOf(a);
    const chainB = ancestryOf(b);
    let common = chainA[0];
    for (
        let i = 0;
        i < chainA.length && i < chainB.length && chainA[i] === chainB[i];
        i++
    ) {
        common = chainA[i];
    }
    return common;
};

const countContainerAncestors = (node: Node) => {
    let depth = 0;
    for (let current = node.parent; current; current = current.parent) {
        if (isContainer(current)) {
            depth++;
        }
    }
    return depth;
};

/**
 * The smallest complete node containing the selection. A selection that lands
 * on a property's key or value snaps to the whole property; a selection in
 * whitespace outside the root snaps to the root.
 */
const findFormatTarget = (root: Node, range: JsoncRange): Node => {
    const start = findNodeAtOffset(root, range.offset) ?? root;
    const lastOffset =
        range.length > 0 ? range.offset + range.length - 1 : range.offset;
    const end = findNodeAtOffset(root, lastOffset) ?? root;
    const ancestor = commonAncestor(start, end);
    return ancestor.parent?.type === 'property' ? ancestor.parent : ancestor;
};

/**
 * Format only the smallest complete value or property that contains `range`.
 * Returns the single edit to apply, or `undefined` for invalid JSON. Comments
 * outside the target node's span are untouched.
 */
export const formatJsoncCompactRange = (
    content: string,
    range: JsoncRange,
    options: JsoncCompactFormatOptions
): JsoncTextEdit | undefined => {
    const ctx = parseDocument(content, options);
    if (!ctx) {
        return undefined;
    }
    const target = findFormatTarget(ctx.root, range);
    const siblings = target.parent?.children ?? [];
    const isLast =
        siblings.length === 0 || siblings[siblings.length - 1] === target;
    return {
        offset: target.offset,
        length: target.length,
        content: renderNode(
            ctx,
            target,
            countContainerAncestors(target),
            isLast ? 0 : 1
        )
    };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w @deneb-viz/utils -- src/lib/__tests__/jsonc-format.test.ts`
Expected: PASS (all parity, fidelity, invalid-input and idempotence tests).

If a parity test fails, diff the two outputs: the usual culprits are the `reserved` width (must include the `"key": ` prefix **and** 1 for a non-last comma) and bracket spacing (`{"a": 1}` — no inner padding).

- [ ] **Step 5: Lint and commit**

Run: `npm run eslint -w @deneb-viz/utils`
Expected: no errors.

```bash
git add packages/utils/src/lib/jsonc-format.ts packages/utils/src/lib/__tests__/jsonc-format.test.ts
git commit -m "$(cat <<'EOF'
feat(utils): compact JSONC formatter with pretty-compact parity

Walks the jsonc-parser AST and applies json-stringify-pretty-compact's
fit rule, copying literals as raw source slices. Comment attachment is
scaffolded; behaviour is covered in the next commit.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Formatter — comment preservation

**Files:**
- Modify: `packages/utils/src/lib/__tests__/jsonc-format.test.ts`
- (No implementation changes expected — Task 1 already wires attachment. This task proves it and fixes anything that falls out.)

- [ ] **Step 1: Add the comment tests**

Append to `jsonc-format.test.ts`:

```ts
describe('formatJsoncCompact — comments', () => {
    it('keeps a leading comment above its property and expands the container', () => {
        const source =
            '{"mark": {\n  // keep bars thin\n  "type": "bar", "width": 4}, "data": {"name": "dataset"}}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            [
                '{',
                '  "mark": {',
                '    // keep bars thin',
                '    "type": "bar",',
                '    "width": 4',
                '  },',
                '  "data": {"name": "dataset"}',
                '}'
            ].join('\n')
        );
    });

    it('keeps a trailing comment on the same line, after the comma', () => {
        const source = '{\n  "width": 400, // matches the report page\n  "height": 300\n}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('keeps a trailing comment on the last property (no comma)', () => {
        const source = '{\n  "width": 400,\n  "height": 300 // tall\n}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('keeps a trailing comment after a nested container', () => {
        const source = '{\n  "a": {"b": 1}, // nested\n  "c": 2\n}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('expands an array that contains a comment (same-line comment trails the preceding element)', () => {
        const source = '{"values": [1, /* two */ 2, 3]}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            [
                '{',
                '  "values": [',
                '    1, /* two */',
                '    2,',
                '    3',
                '  ]',
                '}'
            ].join('\n')
        );
    });

    it('places a comment on its own line above the element it precedes', () => {
        const source = '{"values": [1,\n  // two\n  2, 3]}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            [
                '{',
                '  "values": [',
                '    1,',
                '    // two',
                '    2,',
                '    3',
                '  ]',
                '}'
            ].join('\n')
        );
    });

    it('keeps a comment that sits after the last child inside its container', () => {
        const source = '{\n  "a": 1\n  // end of object\n}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('keeps comments inside an otherwise empty container', () => {
        const source = '{\n  // nothing yet\n}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('emits comments before and after the root value on their own lines', () => {
        const source = '// header\n{"a": 1} // same line as root\n// footer';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(source);
    });

    it('re-indents the continuation lines of a multi-line block comment', () => {
        const source = [
            '{',
            '  "transform": [',
            '    /* Filter out',
            '            nulls first */',
            '    {"filter": "datum.Sales != null"}',
            '  ]',
            '}',
            '// TODO: add a legend'
        ].join('\n');
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            [
                '{',
                '  "transform": [',
                '    /* Filter out',
                '       nulls first */',
                '    {"filter": "datum.Sales != null"}',
                '  ]',
                '}',
                '// TODO: add a legend'
            ].join('\n')
        );
    });

    it('moves a comment between a key and its value above the next entry (documented quirk)', () => {
        const source = '{"a": // odd place\n  1, "b": 2}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            ['{', '  "a": 1,', '  // odd place', '  "b": 2', '}'].join('\n')
        );
    });

    it('moves a comment between the last key and its value to the end of the object (documented quirk)', () => {
        const source = '{"a": 1, "b": // odd place\n  2}';
        expect(formatJsoncCompact(source, OPTIONS)).toBe(
            ['{', '  "a": 1,', '  "b": 2', '  // odd place', '}'].join('\n')
        );
    });

    it('is idempotent with comments present', () => {
        const source =
            '// header\n{"mark": {\n  // keep bars thin\n  "type": "bar"}, "w": 1 // trailing\n}';
        const once = formatJsoncCompact(source, OPTIONS);
        expect(formatJsoncCompact(once, OPTIONS)).toBe(once);
    });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -w @deneb-viz/utils -- src/lib/__tests__/jsonc-format.test.ts`
Expected: PASS. If any comment test fails, fix `attachComments` / `renderNode` in `jsonc-format.ts` — do not weaken the test; these outputs are the documented contract in the spec (R1 step 2 examples).

- [ ] **Step 3: Commit**

```bash
git add packages/utils/src/lib/__tests__/jsonc-format.test.ts packages/utils/src/lib/jsonc-format.ts
git commit -m "$(cat <<'EOF'
test(utils): comment preservation cases for compact JSONC formatter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Formatter — range formatting and public re-export

**Files:**
- Modify: `packages/utils/src/lib/__tests__/jsonc-format.test.ts`
- Modify: `packages/utils/src/lib/jsonc.ts`

- [ ] **Step 1: Add the range tests**

Append to `jsonc-format.test.ts` (and add `formatJsoncCompactRange` to the import from `'../jsonc-format'`):

```ts
describe('formatJsoncCompactRange', () => {
    const DOC = [
        '{',
        '  "mark": "bar",',
        '  "encoding": {',
        '    "x": {',
        '      "field": "Category",',
        '      "type": "nominal"',
        '    },',
        '    "y": {"field": "Sales", "type": "quantitative"}',
        '  },',
        '  "data": [1,2,3]',
        '}'
    ].join('\n');

    const apply = (doc: string, edit: { offset: number; length: number; content: string }) =>
        doc.slice(0, edit.offset) + edit.content + doc.slice(edit.offset + edit.length);

    const rangeOf = (doc: string, text: string) => ({
        offset: doc.indexOf(text),
        length: text.length
    });

    /** Offsets spanning from the start of `from` to the end of `to`. */
    const spanOf = (doc: string, from: string, to: string) => {
        const offset = doc.indexOf(from);
        return { offset, length: doc.indexOf(to) + to.length - offset };
    };

    const X_BODY = spanOf(DOC, '"field": "Category"', '"nominal"');

    it('snaps a selection on a scalar value to its property (which may already be formatted)', () => {
        const edit = formatJsoncCompactRange(DOC, rangeOf(DOC, '"Category"'), OPTIONS)!;
        expect(DOC.slice(edit.offset, edit.offset + edit.length)).toBe(
            '"field": "Category"'
        );
        expect(edit.content).toBe('"field": "Category"');
    });

    it('snaps a selection spanning the children of a nested object to the enclosing property', () => {
        const edit = formatJsoncCompactRange(DOC, X_BODY, OPTIONS);
        expect(edit).toBeDefined();
        expect(DOC.slice(edit!.offset, edit!.offset + edit!.length)).toBe(
            '"x": {\n      "field": "Category",\n      "type": "nominal"\n    }'
        );
        expect(edit!.content).toBe('"x": {"field": "Category", "type": "nominal"}');
    });

    it('leaves the rest of the document untouched when applying the edit', () => {
        const edit = formatJsoncCompactRange(DOC, X_BODY, OPTIONS)!;
        expect(apply(DOC, edit)).toBe(
            [
                '{',
                '  "mark": "bar",',
                '  "encoding": {',
                '    "x": {"field": "Category", "type": "nominal"},',
                '    "y": {"field": "Sales", "type": "quantitative"}',
                '  },',
                '  "data": [1,2,3]',
                '}'
            ].join('\n')
        );
    });

    it('snaps a selection spanning two siblings to their parent', () => {
        const start = DOC.indexOf('"x"');
        const end = DOC.indexOf('"quantitative"}') + '"quantitative"}'.length;
        const edit = formatJsoncCompactRange(DOC, { offset: start, length: end - start }, OPTIONS)!;
        expect(DOC.slice(edit.offset, edit.offset + edit.length).startsWith('"encoding": {')).toBe(true);
        expect(edit.content).toBe(
            [
                '"encoding": {',
                '    "x": {"field": "Category", "type": "nominal"},',
                '    "y": {"field": "Sales", "type": "quantitative"}',
                '  }'
            ].join('\n')
        );
    });

    it('snaps a selection on a key to the whole property', () => {
        const edit = formatJsoncCompactRange(DOC, rangeOf(DOC, '"data"'), OPTIONS)!;
        expect(DOC.slice(edit.offset, edit.offset + edit.length)).toBe('"data": [1,2,3]');
        expect(edit.content).toBe('"data": [1, 2, 3]');
    });

    it('uses structural depth for continuation-line indent', () => {
        const narrow = { tabSize: 2, maxLineLength: 30 };
        const edit = formatJsoncCompactRange(
            DOC,
            spanOf(DOC, '"field": "Sales"', '"quantitative"'),
            narrow
        )!;
        // "y" sits three containers deep (root → encoding → y's object), so its
        // children indent to 6 and its closer to 4.
        expect(edit.content).toBe(
            ['"y": {', '      "field": "Sales",', '      "type": "quantitative"', '    }'].join('\n')
        );
    });

    it('reserves a column for the comma when the target is not the last sibling', () => {
        // "x" + comma is exactly 1 over the limit when packed at depth 2.
        const flat = '"x": {"field": "Category", "type": "nominal"}';
        const limit = 2 * 2 + flat.length; // indent + flat, no room for the comma
        const edit = formatJsoncCompactRange(DOC, X_BODY, { tabSize: 2, maxLineLength: limit })!;
        expect(edit.content.includes('\n')).toBe(true);
        // One more column and it fits.
        const roomy = formatJsoncCompactRange(DOC, X_BODY, { tabSize: 2, maxLineLength: limit + 1 })!;
        expect(roomy.content).toBe(flat);
    });

    it('formats the whole document when the selection is outside the root', () => {
        const doc = '{"a":1}\n\n';
        const edit = formatJsoncCompactRange(doc, { offset: doc.length - 1, length: 0 }, OPTIONS)!;
        expect(edit).toEqual({ offset: 0, length: 7, content: '{"a": 1}' });
    });

    it('returns undefined for invalid JSON', () => {
        expect(formatJsoncCompactRange('{"a": 1,', { offset: 0, length: 1 }, OPTIONS)).toBeUndefined();
    });

    it('does not touch comments outside the target span', () => {
        const doc = '{\n  "a": {"b":1}, // keep me\n  "c": 2\n}';
        const edit = formatJsoncCompactRange(doc, rangeOf(doc, '"b"'), OPTIONS)!;
        expect(apply(doc, edit)).toBe('{\n  "a": {"b": 1}, // keep me\n  "c": 2\n}');
    });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -w @deneb-viz/utils -- src/lib/__tests__/jsonc-format.test.ts`
Expected: PASS.

- [ ] **Step 3: Re-export from `jsonc.ts`**

Append to the end of `packages/utils/src/lib/jsonc.ts`:

```ts
export {
    formatJsoncCompact,
    formatJsoncCompactRange,
    type JsoncCompactFormatOptions,
    type JsoncRange,
    type JsoncTextEdit
} from './jsonc-format';
```

- [ ] **Step 4: Build utils and run its whole suite**

Run: `npm run build -w @deneb-viz/utils && npm test -w @deneb-viz/utils`
Expected: build succeeds (`dist/lib/jsonc-format.js` and `.d.ts` exist), all utils tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/utils/src/lib/jsonc.ts packages/utils/src/lib/__tests__/jsonc-format.test.ts
git commit -m "$(cat <<'EOF'
feat(utils): range formatting for compact JSONC formatter

Snaps the selection outward to the smallest complete node and renders
only that node at its structural depth. Re-exported via utils/jsonc.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Default + store property

**Files:**
- Modify: `packages/configuration/src/index.ts:50-64`
- Modify: `packages/app-core/src/state/editor-preferences.ts:9-20,42-57`

- [ ] **Step 1: Add the default**

In `packages/configuration/src/index.ts`, inside `EDITOR_DEFAULTS`, after the `fontSize` entry add:

```ts
    formattingMaxLineLength: { default: 80, min: 40, max: 200 },
```

- [ ] **Step 2: Add the slice property**

In `packages/app-core/src/state/editor-preferences.ts`:

In `EditorPreferencesSliceProperties`, after `jsonEditorFontSize: number;` add:

```ts
    jsonEditorFormattingMaxLineLength: number;
```

In the initial state object (inside `createEditorPreferencesSlice`), after `jsonEditorFontSize: EDITOR_DEFAULTS.fontSize.default,` add:

```ts
            jsonEditorFormattingMaxLineLength:
                EDITOR_DEFAULTS.formattingMaxLineLength.default,
```

- [ ] **Step 3: Build and typecheck**

Run: `npm run build -w @deneb-viz/configuration && npm run typecheck -w @deneb-viz/app-core`
Expected: both succeed. (If `typecheck` is not a script in app-core, run `npx tsc --noEmit -p packages/app-core/tsconfig.json`.)

- [ ] **Step 4: Commit**

```bash
git add packages/configuration/src/index.ts packages/app-core/src/state/editor-preferences.ts
git commit -m "$(cat <<'EOF'
feat(app-core): jsonEditorFormattingMaxLineLength preference (default 80)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Power BI property → formatting pane → sync

**Files:**
- Modify: `capabilities.json:291-295`
- Modify: `src/lib/persistence/model/settings-editor.ts:98-120`
- Modify: `stringResources/en-US/resources.resjson:100`
- Modify: `src/lib/state/editor-preferences-sync-mappings.ts:27-33`

- [ ] **Step 1: Capabilities**

In `capabilities.json`, inside `objects.editor.properties`, directly after the `debouncePeriod` entry add:

```json
                "formattingMaxLineLength": {
                    "type": {
                        "numeric": true
                    }
                }
```

(Add the comma after `debouncePeriod`'s closing brace.)

- [ ] **Step 2: Formatting model**

In `src/lib/persistence/model/settings-editor.ts`, inside `SettingsEditorGroupJson`, after the `debouncePeriod` slice definition add:

```ts
    formattingMaxLineLength = new formattingSettings.NumUpDown({
        name: 'formattingMaxLineLength',
        displayNameKey: 'Objects_Editor_FormattingMaxLineLength',
        descriptionKey: 'Objects_Editor_FormattingMaxLineLength_Description',
        options: {
            minValue: {
                value: EDITOR_DEFAULTS.formattingMaxLineLength.min,
                type: 0
            },
            maxValue: {
                value: EDITOR_DEFAULTS.formattingMaxLineLength.max,
                type: 1
            }
        },
        value: EDITOR_DEFAULTS.formattingMaxLineLength.default
    });
```

and add `this.formattingMaxLineLength` to the end of that group's `slices` array:

```ts
    slices = [
        this.position,
        this.fontSize,
        this.wordWrap,
        this.showLineNumbers,
        this.debouncePeriod,
        this.formattingMaxLineLength
    ];
```

- [ ] **Step 3: Strings (en-US only — the other 44 locales do not carry the editor keys)**

In `stringResources/en-US/resources.resjson`, after the `Objects_Editor_DebouncePeriod_Description` line add:

```json
    "Objects_Editor_FormattingMaxLineLength": "Maximum line length when formatting",
    "Objects_Editor_FormattingMaxLineLength_Description": "When formatting JSON, objects and arrays that fit within this many characters are written on a single line; longer ones are expanded one entry per line. Comments always force expansion.",
```

- [ ] **Step 4: Sync mapping**

In `src/lib/state/editor-preferences-sync-mappings.ts`, after the `jsonEditorFontSize` mapping add:

```ts
        {
            sliceKey: 'jsonEditorFormattingMaxLineLength',
            getVisualValue: (s) => s.editor.json.formattingMaxLineLength.value,
            persistence: {
                objectName: 'editor',
                propertyName: 'formattingMaxLineLength'
            }
        },
```

- [ ] **Step 5: Build app-core (so the new slice type is visible to the root) and typecheck the root**

Run: `npm run build -w @deneb-viz/app-core && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add capabilities.json src/lib/persistence/model/settings-editor.ts stringResources/en-US/resources.resjson src/lib/state/editor-preferences-sync-mappings.ts
git commit -m "$(cat <<'EOF'
feat: formattingMaxLineLength editor property (Advanced editor > JSON editor)

NumUpDown 40-200, default 80, synced to the app-core store.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: json-processing delegates to the compact formatter

**Files:**
- Modify: `packages/json-processing/src/processing.ts:1-10,66-79`
- Modify: `packages/json-processing/src/template-usermeta.ts:62-101,270-290,368-385,435-470`
- Modify: `packages/json-processing/src/__test__/processing.test.ts:114-122`
- Modify: `packages/json-processing/src/__test__/template-usermeta.test.ts:225-283,520-528,640-668,740-764`

- [ ] **Step 1: Update the existing expectations first (they define the new contract)**

`processing.test.ts` — replace the `getTextFormattedAsJsonC` describe block with:

```ts
describe('getTextFormattedAsJsonC', () => {
    it('should pack content that fits within the default max line length onto one line', () => {
        const content = '{"name": "John", "age": 30}';
        expect(getTextFormattedAsJsonC(content, 4)).toBe(
            '{"name": "John", "age": 30}'
        );
    });

    it('should expand content that exceeds the supplied max line length using the tab size', () => {
        const content = '{"name": "John", "age": 30}';
        const tabSize = 4;
        const indent = ' '.repeat(tabSize);
        const expected = `{\n${indent}"name": "John",\n${indent}"age": 30\n}`;
        expect(getTextFormattedAsJsonC(content, tabSize, 20)).toBe(expected);
    });
});
```

`template-usermeta.test.ts`:

1. In `describe('getTemplateResolvedForLegacyConfig')`, first test: change `expectedTemplate` to

   ```ts
        const expectedTemplate =
            '{ "usermeta": {"config": "{\\"foo\\": \\"bar\\"}" } }';
   ```

2. In `describe('getTemplateResolvedForPlaceholderAssignment')`, **both** tests: replace the `spec:` template literal in `expectedComponents` with

   ```ts
            spec: `{
  "data": {"values": []},
  "mark": {"type": "bar"},
  "encoding": {
    "x": {"field": "__0__", "type": "temporal"},
    "y": {"field": "__1__", "type": "quantitative"}
  }
}`,
   ```

   (The `config:` values are unchanged — config is stored as a string and is not reformatted here.)

3. In `describe('getExportTemplate')`: the expected string depends on mock constants, so assert content via the formatter rather than hand-laying-out the bytes. Add to the file's imports:

   ```ts
   import { formatJsoncCompact } from '@deneb-viz/utils/jsonc';
   ```

   and change the final assertion of that test from `expect(result).toEqual(expectedJsonc);` to

   ```ts
        expect(result).toEqual(
            formatJsoncCompact(expectedJsonc, { tabSize: 2, maxLineLength: 80 })
        );
   ```

   Leave `expectedJsonc` itself as-is — it still pins key order and content; layout is utils' responsibility and is covered there.

- [ ] **Step 2: Run the json-processing tests to verify they fail**

Run: `npm test -w @deneb-viz/json-processing`
Expected: FAIL on the four updated expectations (everything else passes).

- [ ] **Step 3: Delegate `getTextFormattedAsJsonC`**

In `packages/json-processing/src/processing.ts`, change the imports at the top to:

```ts
import {
    applyEdits,
    getNodeValue,
    modify,
    parseTree,
    Node
} from 'jsonc-parser';
import { JSONPath } from 'vscode-json-languageservice';
import { EDITOR_DEFAULTS } from '@deneb-viz/configuration';
import {
    formatJsoncCompact,
    stripJsoncComments
} from '@deneb-viz/utils/jsonc';
```

and replace the `getTextFormattedAsJsonC` function (keep its existing doc comment) with:

```ts
export const getTextFormattedAsJsonC = (
    content: string,
    tabSize: number,
    maxLineLength: number = EDITOR_DEFAULTS.formattingMaxLineLength.default
) => formatJsoncCompact(content, { tabSize, maxLineLength });
```

- [ ] **Step 4: Thread `maxLineLength` through the template helpers**

In `packages/json-processing/src/template-usermeta.ts`:

`getExportTemplate` — add `maxLineLength?: number;` to its `options` type (after `trackedFields: TrackedFields;`), destructure it alongside the others, and change the return to:

```ts
    return getTextFormattedAsJsonC(withSchema, 2, maxLineLength);
```

`getTemplateResolvedForLegacyConfig` — signature becomes

```ts
export const getTemplateResolvedForLegacyConfig = (
    template: string,
    tabSize: number,
    maxLineLength?: number
) => {
```

and its `getTextFormattedAsJsonC(...)` call becomes

```ts
        const newConfig = getTextFormattedAsJsonC(
            JSON.stringify(getJsoncNodeValue(tree)?.config || {}),
            tabSize,
            maxLineLength
        );
```

`getTemplateResolvedForPlaceholderAssignment` — signature becomes

```ts
export const getTemplateResolvedForPlaceholderAssignment = (
    template: string,
    tabSize: number,
    maxLineLength?: number
): DenebTemplateAllocationComponents => {
```

and its `getTextFormattedAsJsonC(...)` call gains the third argument `maxLineLength`.

`getValidatedTemplate` — signature becomes

```ts
export const getValidatedTemplate = (
    content: string,
    tabSize: number,
    maxLineLength?: number
): DenebTemplateSetImportFilePayload => {
```

and pass `maxLineLength` as the third argument to both its `getTemplateResolvedForLegacyConfig(...)` and `getTemplateResolvedForPlaceholderAssignment(...)` calls.

(Passing `undefined` falls through to the default parameter in `getTextFormattedAsJsonC`, so callers that omit it keep today's signature.)

- [ ] **Step 5: Run the json-processing tests**

Run: `npm test -w @deneb-viz/json-processing`
Expected: PASS.

- [ ] **Step 6: Build and commit**

Run: `npm run build -w @deneb-viz/json-processing`

```bash
git add packages/json-processing/src/processing.ts packages/json-processing/src/template-usermeta.ts packages/json-processing/src/__test__/processing.test.ts packages/json-processing/src/__test__/template-usermeta.test.ts
git commit -m "$(cat <<'EOF'
feat(json-processing): format templates with the compact JSONC formatter

getTextFormattedAsJsonC delegates to utils; template export/import
helpers accept an optional maxLineLength.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: app-core call sites pass the user's max line length

**Files:**
- Modify: `packages/app-core/src/features/project-export/components/export-buttons.tsx:113-131`
- Modify: `packages/app-core/src/features/project-create/components/import-dropzone.tsx:203-214`
- Modify: `packages/app-core/src/features/project-create/components/select-included-template.tsx:84-96`

- [ ] **Step 1: Export**

In `export-buttons.tsx`, inside `getProcessedExportTemplate`, change the store read and the call to:

```ts
    const {
        i18n: { translate },
        editorPreferences: { jsonEditorFormattingMaxLineLength }
    } = getDenebState();
    const informationTranslationPlaceholders = {
        name: translate('Template_Export_Information_Name_Empty'),
        description: translate('Template_Export_Information_Description_Empty'),
        author: translate('Template_Export_Author_Name_Empty')
    };
    return getExportTemplate({
        informationTranslationPlaceholders,
        metadata,
        supportFieldConfiguration,
        tokenizedSpec,
        trackedFields,
        maxLineLength: jsonEditorFormattingMaxLineLength
    });
```

- [ ] **Step 2: Import (dropzone)**

In `import-dropzone.tsx`, inside `handleValidation`, change to:

```ts
const handleValidation = (content: string) => {
    const {
        create: { setImportFile, setImportState },
        editorPreferences: { jsonEditorFormattingMaxLineLength }
    } = getDenebState();
    setImportState({ importState: 'Validating', refresh: true });
    const validationResult = getValidatedTemplate(
        content,
        EDITOR_DEFAULTS.tabSize,
        jsonEditorFormattingMaxLineLength
    );
    setImportFile(validationResult);
};
```

- [ ] **Step 3: Import (included templates)**

In `select-included-template.tsx`, add `getDenebState` to the existing state import:

```ts
import { getDenebState, useDenebState } from '../../../state';
```

and inside `dispatchSelectedTemplate` change the call to:

```ts
        const candidates = getTemplateResolvedForPlaceholderAssignment(
            templateContent,
            EDITOR_DEFAULTS.tabSize,
            getDenebState().editorPreferences.jsonEditorFormattingMaxLineLength
        );
```

- [ ] **Step 4: Typecheck and run the app-core suite**

Run: `npm run build -w @deneb-viz/app-core && npm test -w @deneb-viz/app-core`
Expected: build succeeds; tests PASS (no app-core test asserts on template layout — verified during planning).

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/features/project-export/components/export-buttons.tsx packages/app-core/src/features/project-create/components/import-dropzone.tsx packages/app-core/src/features/project-create/components/select-included-template.tsx
git commit -m "$(cat <<'EOF'
feat(app-core): apply formattingMaxLineLength to template import/export

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Monaco — replace the worker formatter, add Format Selection, smart Ctrl+Alt+R

**Files:**
- Modify: `packages/app-core/src/lib/monaco/editor-init-service.ts`
- Modify: `packages/app-core/src/lib/monaco/__tests__/editor-init-service.test.ts`
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add the i18n label**

In `packages/app-core/src/i18n/en-US.json`, add (alphabetically near the other `Text_` keys):

```json
    "Text_Editor_Action_Format": "Format Document or Selection",
```

- [ ] **Step 2: Update the test mocks and write the failing tests**

In `editor-init-service.test.ts`, replace the mock declarations block (from `const mockSetDiagnosticsOptions` through the end of `vi.mock('../monaco-integration', ...)`) with:

```ts
const mockSetDiagnosticsOptions = vi.fn();
const mockSetModeConfiguration = vi.fn();
const mockDisposeCompletionProvider = vi.fn();
const mockRegisterCompletionItemProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeCompletionProvider });
const mockDisposeFormattingProvider = vi.fn();
const mockRegisterDocumentFormattingEditProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockRegisterDocumentRangeFormattingEditProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockAddEditorAction = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockAddKeybindingRules = vi.fn();
const mockSetupMonacoWorker = vi.fn();

vi.mock('../monaco-integration', () => ({
    monaco: {
        languages: {
            json: {
                jsonDefaults: {
                    setDiagnosticsOptions: mockSetDiagnosticsOptions,
                    modeConfiguration: { diagnostics: true, hovers: true },
                    setModeConfiguration: mockSetModeConfiguration
                }
            },
            registerCompletionItemProvider: mockRegisterCompletionItemProvider,
            registerDocumentFormattingEditProvider:
                mockRegisterDocumentFormattingEditProvider,
            registerDocumentRangeFormattingEditProvider:
                mockRegisterDocumentRangeFormattingEditProvider,
            CompletionItemKind: { Field: 5, Property: 9 }
        },
        editor: {
            addKeybindingRules: mockAddKeybindingRules,
            addEditorAction: mockAddEditorAction
        },
        Range: {
            fromPositions: (start: unknown, end: unknown) => ({ start, end })
        },
        Uri: {
            parse: (uri: string) => ({ toString: () => uri })
        },
        KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512 },
        KeyCode: { Enter: 3, KeyR: 48, F1: 59 }
    },
    setupMonacoWorker: mockSetupMonacoWorker
}));
```

Update the `vi.mock('../../../state', ...)` factory so `getDenebState` also returns `editorPreferences`:

```ts
vi.mock('../../../state', () => ({
    getDenebState: vi.fn(() => ({
        editorSelectedOperation: 'Spec',
        dataset: { fields: {} },
        editorPreferences: { jsonEditorFormattingMaxLineLength: 80 },
        project: {
            supportFieldConfiguration: {},
            interactivity: undefined
        },
        i18n: { translate: vi.fn((key: string) => key) }
    }))
}));
```

Replace the `'should add custom keybinding rules'` test with:

```ts
    it('should add custom keybinding rules without the old formatDocument binding', async () => {
        vi.resetModules();
        mockAddKeybindingRules.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        const rules = mockAddKeybindingRules.mock.calls[0][0];
        expect(rules).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ command: null }),
                expect.objectContaining({
                    command: 'editor.action.quickCommand'
                })
            ])
        );
        expect(rules).not.toContainEqual(
            expect.objectContaining({ command: 'editor.action.formatDocument' })
        );
    });
```

Add a new describe block before `describe('retry behaviour', ...)`:

```ts
    describe('formatting', () => {
        const makeModel = (value: string) => ({
            getValue: () => value,
            getOptions: () => ({ tabSize: 2 }),
            getFullModelRange: () => 'FULL_RANGE',
            getOffsetAt: (position: { offset: number }) => position.offset,
            getPositionAt: (offset: number) => ({ offset })
        });

        it('should disable the worker formatter but keep its other features', async () => {
            vi.resetModules();
            mockSetModeConfiguration.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(mockSetModeConfiguration).toHaveBeenCalledWith({
                diagnostics: true,
                hovers: true,
                documentFormattingEdits: false,
                documentRangeFormattingEdits: false
            });
        });

        it('should register a document formatting provider that compacts JSON', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(
                mockRegisterDocumentFormattingEditProvider
            ).toHaveBeenCalledWith('json', expect.any(Object));
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            const edits = provider.provideDocumentFormattingEdits(
                makeModel('{"a":1,\n"b":2}')
            );
            expect(edits).toEqual([
                { range: 'FULL_RANGE', text: '{"a": 1, "b": 2}' }
            ]);
        });

        it('should return no edits when the document is already formatted', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            expect(
                provider.provideDocumentFormattingEdits(
                    makeModel('{"a": 1, "b": 2}')
                )
            ).toEqual([]);
        });

        it('should register a range formatting provider that snaps to the enclosing node', async () => {
            vi.resetModules();
            mockRegisterDocumentRangeFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentRangeFormattingEditProvider.mock
                    .calls[0][1];
            const doc = '{\n  "a": {\n    "b": 1\n  },\n  "c": 2\n}';
            // Select from the opening brace of "a"'s value to its closing
            // brace — the common ancestor is that object, which snaps to the
            // "a" property.
            const range = {
                getStartPosition: () => ({ offset: doc.indexOf('{', 1) }),
                getEndPosition: () => ({ offset: doc.indexOf('}') + 1 })
            };
            const edits = provider.provideDocumentRangeFormattingEdits(
                makeModel(doc),
                range
            );
            expect(edits).toEqual([
                {
                    range: {
                        start: { offset: doc.indexOf('"a"') },
                        end: { offset: doc.indexOf('},') + 1 }
                    },
                    text: '"a": {"b": 1}'
                }
            ]);
        });

        it('should add a Ctrl+Alt+R action that formats the selection when present, else the document', async () => {
            vi.resetModules();
            mockAddEditorAction.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(mockAddEditorAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'deneb.formatDocumentOrSelection',
                    label: 'Text_Editor_Action_Format',
                    keybindings: [2048 | 512 | 48]
                })
            );
            const { run } = mockAddEditorAction.mock.calls[0][0];
            const actionRun = vi.fn();
            const getAction = vi.fn(() => ({ run: actionRun }));

            run({
                getSelection: () => ({ isEmpty: () => false }),
                getAction
            });
            expect(getAction).toHaveBeenLastCalledWith(
                'editor.action.formatSelection'
            );

            run({
                getSelection: () => ({ isEmpty: () => true }),
                getAction
            });
            expect(getAction).toHaveBeenLastCalledWith(
                'editor.action.formatDocument'
            );
            expect(actionRun).toHaveBeenCalledTimes(2);
        });

        it('should dispose previous formatting registrations before re-registering on retry', async () => {
            vi.resetModules();
            mockDisposeFormattingProvider.mockClear();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            // Formatting is configured before keybindings; make keybindings
            // throw so the first attempt fails after formatting is registered.
            mockAddKeybindingRules.mockImplementationOnce(() => {
                throw new Error('keybinding failure');
            });
            const service = await import('../editor-init-service');
            await expect(
                service.initializeEditorDependencies()
            ).rejects.toThrow('keybinding failure');
            expect(mockRegisterDocumentFormattingEditProvider).toHaveBeenCalledTimes(1);

            await service.initializeEditorDependencies();
            // Three disposables (document provider, range provider, action)
            // from the first attempt are disposed on retry.
            expect(mockDisposeFormattingProvider).toHaveBeenCalledTimes(3);
            expect(mockRegisterDocumentFormattingEditProvider).toHaveBeenCalledTimes(2);
        });
    });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -w @deneb-viz/app-core -- src/lib/monaco/__tests__/editor-init-service.test.ts`
Expected: FAIL — `mockSetModeConfiguration` not called, providers not registered, `addEditorAction` not called, and the keybinding test fails because the `formatDocument` rule is still present.

- [ ] **Step 4: Implement**

In `editor-init-service.ts`:

Add to the imports (after the `logDebug` import):

```ts
import {
    formatJsoncCompact,
    formatJsoncCompactRange
} from '@deneb-viz/utils/jsonc';
```

Add after `let completionProviderDisposable ...`:

```ts
let formattingDisposables: { dispose(): void }[] = [];

/** Action id for the Ctrl+Alt+R "format selection, else document" command. */
const FORMAT_ACTION_ID = 'deneb.formatDocumentOrSelection';
```

Add the following function after `configureMonacoCompletionProvider`:

```ts
/**
 * Read formatting options at invocation time, so a change to the
 * `formattingMaxLineLength` property applies to the next format without
 * re-registering providers.
 */
const getFormattingOptions = (model: monaco.editor.ITextModel) => ({
    tabSize: model.getOptions().tabSize,
    maxLineLength:
        getDenebState().editorPreferences.jsonEditorFormattingMaxLineLength
});

/**
 * Replace the JSON worker's formatter (jsonc-parser `format`, which has no
 * line-length control) with Deneb's comment-preserving compact formatter.
 * Registers document and range providers and a Ctrl+Alt+R action that
 * formats the selection when there is one, otherwise the whole document.
 */
const configureMonacoFormatting = () => {
    // Dispose any previous registrations before re-registering to prevent
    // stacking duplicate providers on retry.
    formattingDisposables.forEach((disposable) => disposable.dispose());
    formattingDisposables = [];

    const { jsonDefaults } = monaco.languages.json;
    jsonDefaults.setModeConfiguration({
        ...jsonDefaults.modeConfiguration,
        documentFormattingEdits: false,
        documentRangeFormattingEdits: false
    });

    formattingDisposables.push(
        monaco.languages.registerDocumentFormattingEditProvider('json', {
            provideDocumentFormattingEdits: (model) => {
                const content = model.getValue();
                const formatted = formatJsoncCompact(
                    content,
                    getFormattingOptions(model)
                );
                if (formatted === content) {
                    return [];
                }
                return [{ range: model.getFullModelRange(), text: formatted }];
            }
        }),
        monaco.languages.registerDocumentRangeFormattingEditProvider('json', {
            provideDocumentRangeFormattingEdits: (model, range) => {
                const content = model.getValue();
                const offset = model.getOffsetAt(range.getStartPosition());
                const length =
                    model.getOffsetAt(range.getEndPosition()) - offset;
                const edit = formatJsoncCompactRange(
                    content,
                    { offset, length },
                    getFormattingOptions(model)
                );
                if (
                    !edit ||
                    content.slice(edit.offset, edit.offset + edit.length) ===
                        edit.content
                ) {
                    return [];
                }
                return [
                    {
                        range: monaco.Range.fromPositions(
                            model.getPositionAt(edit.offset),
                            model.getPositionAt(edit.offset + edit.length)
                        ),
                        text: edit.content
                    }
                ];
            }
        }),
        monaco.editor.addEditorAction({
            id: FORMAT_ACTION_ID,
            label: getDenebState().i18n.translate('Text_Editor_Action_Format'),
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR
            ],
            run: (editor) => {
                const selection = editor.getSelection();
                const actionId =
                    selection && !selection.isEmpty()
                        ? 'editor.action.formatSelection'
                        : 'editor.action.formatDocument';
                return editor.getAction(actionId)?.run();
            }
        })
    );
};
```

In `configureMonacoKeyBindings`, **remove** the rule object binding `CtrlCmd | Alt | KeyR` to `'editor.action.formatDocument'` (the action above owns that key now). Update the function's doc comment to:

```ts
/**
 * Override default Monaco key bindings that clash with Deneb hotkeys and
 * add the quick command binding. Format is bound by the editor action in
 * `configureMonacoFormatting`.
 */
```

In `doInitialize`, call the new function between completions and keybindings:

```ts
    configureMonacoDiagnostics();
    configureMonacoCompletionProvider();
    configureMonacoFormatting();
    configureMonacoKeyBindings();
```

and update the numbered list in its doc comment: `5. Configure Monaco diagnostics, completions, formatting, and keybindings`.

- [ ] **Step 5: Run the tests**

Run: `npm test -w @deneb-viz/app-core -- src/lib/monaco/__tests__/editor-init-service.test.ts`
Expected: PASS (all pre-existing tests plus the new `formatting` block).

- [ ] **Step 6: Lint, build, commit**

Run: `npm run eslint -w @deneb-viz/app-core && npm run build -w @deneb-viz/app-core`
Expected: clean.

```bash
git add packages/app-core/src/lib/monaco/editor-init-service.ts packages/app-core/src/lib/monaco/__tests__/editor-init-service.test.ts packages/app-core/src/i18n/en-US.json
git commit -m "$(cat <<'EOF'
feat(app-core): compact JSONC formatting in the Monaco editor (#578)

Disables the JSON worker's formatter and registers document and range
providers backed by the utils formatter. Ctrl+Alt+R now formats the
selection when present, otherwise the document; Format Selection also
appears in the context menu.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Docs, full CI, manual verification

**Files:**
- Modify: `docs/DEVELOPMENT.md` (after the "Feature module boundaries (`app-core`)" subsection in section 5)

- [ ] **Step 1: Add the developer-docs subsection**

Insert after the "Feature module boundaries (`app-core`)" subsection:

````markdown
### JSON formatting (compact JSONC)

All spec/config formatting — Format Document / Format Selection in the editor, and template import/export — goes through `formatJsoncCompact` / `formatJsoncCompactRange` in `@deneb-viz/utils/jsonc`. It walks the jsonc-parser AST and applies the same fit rule as `json-stringify-pretty-compact` (Vega Editor's formatter), but preserves comments. The Monaco JSON worker's own formatter is disabled in `editor-init-service.ts`; the `formattingMaxLineLength` editor property (default 80, range 40–200) sets the width.

Behaviour to be aware of:

- **Compaction rule** — a container is written on one line when its single-line form (including indent, `"key": ` prefix and trailing comma) fits within the max line length and contains no comments; otherwise one child per line. Nested containers are decided independently.
- **Comments force expansion** — any comment inside a container expands it and every ancestor. Comments above a value stay above it; same-line trailing comments stay on the line (a comment following `1, ` on the same line trails `1`, not the next element); comments after the last entry stay before the closer. A comment between a key and its value is moved above the next entry (or to the end of the object if there is none).
- **Range formatting snaps outward** — the smallest complete value or property containing the selection is reformatted. Selecting a key or value reformats the whole property.
- **Invalid JSON is left untouched** — nothing happens until parse errors (including trailing commas) are resolved.
- **Layout is deterministic** — existing line breaks are not preserved; formatting is idempotent.
- **Literals are copied verbatim** — `1.0` stays `1.0`; escapes are not rewritten.

Design record: [docs/brainstorms/2026-08-21-compact-jsonc-formatting-requirements.md](brainstorms/2026-08-21-compact-jsonc-formatting-requirements.md).
````

- [ ] **Step 2: Run the full local CI mirror**

Run: `npm run ci:local`
Expected: PASS (lint, prettier, tests across all packages, build). Fix anything it reports before continuing — commonly prettier reflow in the new test file.

- [ ] **Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md
git commit -m "$(cat <<'EOF'
docs: describe compact JSONC formatting behaviour and quirks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Manual verification in Power BI Desktop (dev build)**

Run `npm run dev`, load the dev visual, open the Advanced Editor, and confirm:

1. Paste a fully-expanded Vega-Lite spec; **Ctrl+Alt+R** with no selection → whole document compacts; short encodings sit on one line.
2. Expand one object by hand, select inside it, **Ctrl+Alt+R** → only that enclosing property reformats; the rest is untouched.
3. Right-click → **Format Document** present always; **Format Selection** present with a selection; both behave as above.
4. Add `// comment` lines above a property and at the end of a line; format → comments stay put; their containers expand.
5. Formatting pane → Advanced editor → JSON editor → set **Maximum line length when formatting** to 40; format again → more expansion, no reload needed. Set back to 80.
6. Export a template → downloaded JSON is compact. Import it via the dropzone → editor shows compact content. Create from an included template → compact.
7. Press **F1** in the editor → "Format Document or Selection" appears in the command palette.

Record any deviation as a follow-up issue; the feature is complete when all seven hold.

---

## Self-review against the spec

| Spec | Task |
| --- | --- |
| R1 formatter + algorithm + range | Tasks 1–3 |
| R2 setting (capabilities, model, strings, default, sync, slice) | Tasks 4–5 |
| R3 Monaco (mode config, providers, smart action, language-scoped) | Task 8 |
| R4 call sites (processing shim, template helpers, three app-core sites) | Tasks 6–7 |
| R5 behaviour & quirks documentation | Task 9 (DEVELOPMENT.md; the user-docs site is a separate repo — reuse the same list) |
| Testing: parity oracle, comments, fidelity, invalid, range, idempotence, existing test updates, manual checks | Tasks 1–3, 6, 8, 9 |
| Out of scope honoured: no "never compact", no keepLines, no format-on-type, `utils/object.ts` untouched | — |
