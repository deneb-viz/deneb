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
