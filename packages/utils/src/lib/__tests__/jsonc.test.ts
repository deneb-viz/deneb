import { describe, it, expect } from 'vitest';
import { parseJsoncWithResult, stripJsoncComments } from '../jsonc';

describe('stripJsoncComments', () => {
    it('replaces comments so line numbers are preserved', () => {
        const content = '{\n  // a comment\n  "a": 1\n}';
        const stripped = stripJsoncComments(content);
        expect(stripped).not.toContain('//');
        // Newlines are preserved, so parse-error line numbers stay aligned.
        const newlines = (s: string) => (s.match(/\n/g) ?? []).length;
        expect(newlines(stripped)).toBe(newlines(content));
        expect(JSON.parse(stripped)).toEqual({ a: 1 });
    });

    it('defaults empty/nullish content to an empty object literal', () => {
        expect(stripJsoncComments('')).toBe('{}');
        expect(stripJsoncComments(undefined)).toBe('{}');
        expect(stripJsoncComments(null)).toBe('{}');
    });

    it('honours a custom replacement character', () => {
        const stripped = stripJsoncComments('{"a":1} // c', '*');
        expect(stripped).not.toContain('//');
        expect(stripped).toContain('*');
    });
});

describe('parseJsoncWithResult', () => {
    it('parses valid JSONC (comments stripped) with no errors', () => {
        expect(parseJsoncWithResult('{ "a": 1 /* inline */ }')).toEqual({
            result: { a: 1 },
            errors: []
        });
    });

    it('parses empty/nullish content as an empty object', () => {
        expect(parseJsoncWithResult('')).toEqual({ result: {}, errors: [] });
        expect(parseJsoncWithResult(undefined)).toEqual({
            result: {},
            errors: []
        });
    });

    it('returns the raw parse-error message (no enrichment) on malformed JSON', () => {
        const result = parseJsoncWithResult('{ "a": }');
        expect(result.result).toBeNull();
        expect(result.errors).toHaveLength(1);
        expect(typeof result.errors[0]).toBe('string');
        // The core does not add line numbers — that is the caller's decoration.
        expect(result.errors[0]).not.toMatch(/ at line \d+/);
    });
});
