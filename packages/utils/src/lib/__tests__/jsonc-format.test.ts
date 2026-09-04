import { describe, expect, it } from 'vitest';
import stringify from 'json-stringify-pretty-compact';
import { formatJsoncCompact, formatJsoncCompactRange } from '../jsonc-format';

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
        expectParity({
            matrix: [
                [1, 2],
                [3, 4],
                [5, 6]
            ]
        });
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
        const source =
            '{\n  "width": 400, // matches the report page\n  "height": 300\n}';
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

    const apply = (
        doc: string,
        edit: { offset: number; length: number; content: string }
    ) =>
        doc.slice(0, edit.offset) +
        edit.content +
        doc.slice(edit.offset + edit.length);

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
        const edit = formatJsoncCompactRange(
            DOC,
            rangeOf(DOC, '"Category"'),
            OPTIONS
        )!;
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
        expect(edit!.content).toBe(
            '"x": {"field": "Category", "type": "nominal"}'
        );
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
        const edit = formatJsoncCompactRange(
            DOC,
            { offset: start, length: end - start },
            OPTIONS
        )!;
        expect(
            DOC.slice(edit.offset, edit.offset + edit.length).startsWith(
                '"encoding": {'
            )
        ).toBe(true);
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
        const edit = formatJsoncCompactRange(
            DOC,
            rangeOf(DOC, '"data"'),
            OPTIONS
        )!;
        expect(DOC.slice(edit.offset, edit.offset + edit.length)).toBe(
            '"data": [1,2,3]'
        );
        expect(edit.content).toBe('"data": [1, 2, 3]');
    });

    it('uses structural depth for continuation-line indent', () => {
        const narrow = { tabSize: 2, maxLineLength: 30 };
        const edit = formatJsoncCompactRange(
            DOC,
            spanOf(DOC, '"field": "Sales"', '"quantitative"'),
            narrow
        )!;
        // "y" sits two containers deep (root → encoding's object), so its
        // children indent to 6 and its closer to 4.
        expect(edit.content).toBe(
            [
                '"y": {',
                '      "field": "Sales",',
                '      "type": "quantitative"',
                '    }'
            ].join('\n')
        );
    });

    it('reserves a column for the comma when the target is not the last sibling', () => {
        // "x" + comma is exactly 1 over the limit when packed at depth 2.
        const flat = '"x": {"field": "Category", "type": "nominal"}';
        const limit = 2 * 2 + flat.length; // indent + flat, no room for the comma
        const edit = formatJsoncCompactRange(DOC, X_BODY, {
            tabSize: 2,
            maxLineLength: limit
        })!;
        expect(edit.content.includes('\n')).toBe(true);
        // One more column and it fits.
        const roomy = formatJsoncCompactRange(DOC, X_BODY, {
            tabSize: 2,
            maxLineLength: limit + 1
        })!;
        expect(roomy.content).toBe(flat);
    });

    it('formats the whole document when the selection is outside the root', () => {
        const doc = '{"a":1}\n\n';
        const edit = formatJsoncCompactRange(
            doc,
            { offset: doc.length - 1, length: 0 },
            OPTIONS
        )!;
        expect(edit).toEqual({ offset: 0, length: 7, content: '{"a": 1}' });
    });

    it('returns undefined for invalid JSON', () => {
        expect(
            formatJsoncCompactRange(
                '{"a": 1,',
                { offset: 0, length: 1 },
                OPTIONS
            )
        ).toBeUndefined();
    });

    it('does not touch comments outside the target span', () => {
        const doc = '{\n  "a": {"b":1}, // keep me\n  "c": 2\n}';
        const edit = formatJsoncCompactRange(
            doc,
            rangeOf(doc, '"b"'),
            OPTIONS
        )!;
        expect(apply(doc, edit)).toBe(
            '{\n  "a": {"b": 1}, // keep me\n  "c": 2\n}'
        );
    });

    // A comment between a property's key and its value sits INSIDE the
    // property's source span, but attaches to the NEXT sibling (or the
    // enclosing container when there is none) — outside the property's
    // subtree. Replacing only the property's span must not swallow it: the
    // target widens until the replacement re-renders the comment.
    describe('comments inside the target span but attached outside it', () => {
        it('key–value gap with a following sibling: widens so the comment survives', () => {
            const doc = '{"a" /* keep */: 1, "b": 2}';
            const edit = formatJsoncCompactRange(
                doc,
                rangeOf(doc, '"a"'),
                OPTIONS
            )!;
            const result = apply(doc, edit);
            expect(result).toContain('/* keep */');
            // Widening lands on the root object here, so the applied result
            // matches whole-document formatting.
            expect(result).toBe(formatJsoncCompact(doc, OPTIONS));
        });

        it('colon–value gap on the only property: widens so the comment survives', () => {
            const doc = '{\n  "a": /* keep */ 1\n}';
            const edit = formatJsoncCompactRange(
                doc,
                rangeOf(doc, '1'),
                OPTIONS
            )!;
            expect(apply(doc, edit)).toContain('/* keep */');
        });

        it('does not widen when the comment lies outside the target span', () => {
            const doc = '{"a": {\n  /* keep */ "x": 1\n}, "b": 2}';
            const edit = formatJsoncCompactRange(
                doc,
                rangeOf(doc, '"x"'),
                OPTIONS
            )!;
            // The comment leads "x", sitting BEFORE the property's span —
            // the edit stays narrow and the comment survives in place.
            expect(doc.slice(edit.offset, edit.offset + edit.length)).toBe(
                '"x": 1'
            );
            expect(apply(doc, edit)).toContain('/* keep */');
        });

        it('does not widen for a gap comment elsewhere in the document', () => {
            const doc = '{"a" /* keep */: 1, "b": {"c":1}}';
            const edit = formatJsoncCompactRange(
                doc,
                rangeOf(doc, '"c"'),
                OPTIONS
            )!;
            expect(doc.slice(edit.offset, edit.offset + edit.length)).toBe(
                '"c":1'
            );
            expect(apply(doc, edit)).toContain('/* keep */');
        });
    });
});
