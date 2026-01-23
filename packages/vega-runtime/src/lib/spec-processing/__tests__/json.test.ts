import { describe, expect, it } from 'vitest';
import { parseJsonWithResult, redactJsonFromError } from '../json';

describe('parseJsonWithResult', () => {
    it('should parse valid JSON successfully', () => {
        const json = '{"name": "test", "value": 123}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({ name: 'test', value: 123 });
    });

    it('should handle empty object', () => {
        const result = parseJsonWithResult('{}');

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({});
    });

    it('should handle arrays', () => {
        const result = parseJsonWithResult('[1, 2, 3]');

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual([1, 2, 3]);
    });

    it('should handle nested objects', () => {
        const json = '{"outer": {"inner": {"value": 42}}}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({
            outer: { inner: { value: 42 } }
        });
    });

    it('should return error for invalid JSON', () => {
        const json = '{"name": "test", invalid}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
        // Error message varies by Node version - just check it exists
        expect(result.errors[0].length).toBeGreaterThan(0);
    });

    it('should include line number in error message when position is provided', () => {
        // Use JSON that triggers a "position" error message
        const json = `{
            "name": "test",
            invalid
        }`;
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
        // Should include line number when position is in error
        expect(result.errors[0]).toMatch(/line \d+/);
    });

    it('should handle missing comma error', () => {
        const json = '{"a": 1 "b": 2}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
    });

    it('should handle trailing comma error', () => {
        const json = '{"a": 1, "b": 2,}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
    });

    it('should handle empty string as empty object', () => {
        // stripComments converts empty string to '{}' for safety
        const result = parseJsonWithResult('');

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({});
    });

    it('should handle whitespace-only string', () => {
        const result = parseJsonWithResult('   \n   ');

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
    });

    it('should parse complex Vega spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": 400,
            "height": 200,
            "data": [{"name": "table", "values": [1, 2, 3]}],
            "marks": [
                {
                    "type": "rect",
                    "encode": {
                        "update": {"x": {"value": 0}}
                    }
                }
            ]
        }`;

        const result = parseJsonWithResult(spec);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toHaveProperty('$schema');
        expect(result.result).toHaveProperty('marks');
    });

    it('should handle unicode characters', () => {
        const json = '{"emoji": "🎉", "chinese": "你好"}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({ emoji: '🎉', chinese: '你好' });
    });

    it('should parse JSONC with single-line comments', () => {
        const jsonc = `{
            // This is a comment
            "name": "test",
            "value": 42 // inline comment
        }`;
        const result = parseJsonWithResult(jsonc);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({ name: 'test', value: 42 });
    });

    it('should parse JSONC with multi-line comments', () => {
        const jsonc = `{
            /* This is a
               multi-line comment */
            "name": "test",
            "value": 42
        }`;
        const result = parseJsonWithResult(jsonc);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({ name: 'test', value: 42 });
    });

    it('should parse JSONC with mixed comment styles', () => {
        const jsonc = `{
            /* Block comment */
            "width": 400, // Width setting
            // Another line comment
            "height": 200
            /* Final block */
        }`;
        const result = parseJsonWithResult(jsonc);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({ width: 400, height: 200 });
    });

    it('should preserve line numbers in errors with JSONC comments', () => {
        const jsonc = `{
            // Comment on line 2
            "name": "test",
            // Comment on line 4
            invalid
        }`;
        const result = parseJsonWithResult(jsonc);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
        // Line number should still be accurate despite comments
        expect(result.errors[0]).toMatch(/line \d+/);
    });

    it('should handle real-world Vega spec with comments', () => {
        const spec = `{
            // Vega visualization specification
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            /*
             * Container dimensions
             */
            "width": 400,
            "height": 200, // Fixed height
            // Data definition
            "data": [{"name": "table", "values": [1, 2, 3]}],
            /* Marks array */
            "marks": []
        }`;
        const result = parseJsonWithResult(spec);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toHaveProperty('$schema');
        expect(result.result.width).toBe(400);
        expect(result.result.height).toBe(200);
    });

    it('should handle escaped characters', () => {
        const json = '{"path": "C:\\\\Users\\\\test", "quote": "\\"hello\\""}';
        const result = parseJsonWithResult(json);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toEqual({
            path: 'C:\\Users\\test',
            quote: '"hello"'
        });
    });
});

describe('redactJsonFromError', () => {
    it('should redact JSON from Invalid specification error', () => {
        const error =
            'Invalid specification {"$schema": "...", "width": 400}. Some details...';
        const redacted = redactJsonFromError(error);

        expect(redacted).toBe('Invalid specification. Some details...');
        expect(redacted).not.toContain('{');
        expect(redacted).not.toContain('$schema');
    });

    it('should handle error without JSON', () => {
        const error = 'Invalid specification detected';
        const redacted = redactJsonFromError(error);

        expect(redacted).toBe(error);
    });

    it('should redact JSON greedily from "Invalid specification"', () => {
        const error =
            'Invalid specification {"a": 1} and also {"b": 2} failed';
        const redacted = redactJsonFromError(error);

        // Greedy regex removes everything from first { to last } after "Invalid specification"
        expect(redacted).toBe('Invalid specification failed');
    });

    it('should only redact after "Invalid specification"', () => {
        const error = 'Some other error {"a": 1} occurred';
        const redacted = redactJsonFromError(error);

        expect(redacted).toBe(error); // Should not redact
    });

    it('should handle empty string', () => {
        const redacted = redactJsonFromError('');
        expect(redacted).toBe('');
    });

    it('should handle complex nested JSON in error', () => {
        const error =
            'Invalid specification {"data": [{"name": "test", "values": [1, 2, 3]}], "marks": []}';
        const redacted = redactJsonFromError(error);

        expect(redacted).toBe('Invalid specification');
        expect(redacted).not.toContain('data');
        expect(redacted).not.toContain('marks');
    });

    it('should preserve error message before Invalid specification', () => {
        const error =
            'Error in line 42: Invalid specification {"width": 400}';
        const redacted = redactJsonFromError(error);

        expect(redacted).toBe('Error in line 42: Invalid specification');
    });
});

describe('JSON Utilities Integration', () => {
    it('should work together for error reporting', () => {
        const invalidJson = '{"name": invalid}';
        const parseResult = parseJsonWithResult(invalidJson);

        expect(parseResult.errors).toHaveLength(1);

        // Simulate what parse.ts does
        const errorMessage = parseResult.errors[0];
        const redacted = redactJsonFromError(errorMessage);

        expect(typeof redacted).toBe('string');
        expect(redacted.length).toBeGreaterThan(0);
    });

    it('should handle real-world Vega error scenario', () => {
        const invalidSpec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": 400,
            "height": 200,
            "data": [
                {
                    "name": "table",
                    "values": [1, 2, 3],
                    missing comma here
                }
            ]
        }`;

        const result = parseJsonWithResult(invalidSpec);

        expect(result.errors).toHaveLength(1);
        expect(result.result).toBeNull();
        expect(result.errors[0]).toMatch(/line \d+/);
    });
});
