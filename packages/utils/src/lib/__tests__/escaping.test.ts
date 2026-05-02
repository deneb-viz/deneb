import { escapeVegaExpressionString } from '../escaping';
import { describe, it, expect } from 'vitest';

describe('escapeVegaExpressionString', () => {
    it('should return the same string when no special characters are present', () => {
        expect(escapeVegaExpressionString('hello')).toBe('hello');
    });

    it('should escape single quotes', () => {
        expect(escapeVegaExpressionString("O'Brien")).toBe("O\\'Brien");
    });

    it('should escape backslashes', () => {
        expect(escapeVegaExpressionString('path\\to\\file')).toBe(
            'path\\\\to\\\\file'
        );
    });

    it('should escape backslashes before single quotes to prevent double-escape bypass', () => {
        expect(escapeVegaExpressionString("a\\'b")).toBe("a\\\\\\'b");
    });

    it('should neutralize the injection payload from the issue PoC', () => {
        const malicious = "O'Brien' || true || '";
        const escaped = escapeVegaExpressionString(malicious);
        // When wrapped in single quotes the result must be a single
        // string literal, not a valid compound expression.
        expect(escaped).toBe("O\\'Brien\\' || true || \\'");
        // The full expression that would be produced:
        const expr = `'${escaped}'`;
        expect(expr).toBe("'O\\'Brien\\' || true || \\''");
    });

    it('should handle backslash sequences in datum values', () => {
        const value = "x\\' || datum.__row__ == 42 || \\'y";
        const escaped = escapeVegaExpressionString(value);
        expect(escaped).toBe(
            "x\\\\\\' || datum.__row__ == 42 || \\\\\\'y"
        );
    });

    it('should handle empty string', () => {
        expect(escapeVegaExpressionString('')).toBe('');
    });

    it('should handle string with only a single quote', () => {
        expect(escapeVegaExpressionString("'")).toBe("\\'");
    });

    it('should handle string with only a backslash', () => {
        expect(escapeVegaExpressionString('\\')).toBe('\\\\');
    });

    it('should handle null coerced to string via String()', () => {
        // The caller uses String(value) before passing to this function,
        // so we verify the "null" and "undefined" literal strings pass through.
        expect(escapeVegaExpressionString('null')).toBe('null');
        expect(escapeVegaExpressionString('undefined')).toBe('undefined');
    });
});
