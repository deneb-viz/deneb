import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import * as path from 'node:path';

/**
 * Canary test: enforces the architectural layering rules established
 * by Phases A–D of the app-core normalization plan. Uses the ESLint
 * Node API to programmatically lint src/ and asserts that no file
 * triggers the boundaries/element-types rule.
 *
 * This bypasses the eslint-plugin-only-warn severity downgrade so
 * the rule acts as a true CI gate. The npm run eslint command still
 * reports boundaries findings as warnings (informational); CI is
 * enforced through this test.
 */
describe('architecture-boundaries', () => {
    it('zero boundaries/element-types violations in src/', async () => {
        const eslint = new ESLint({
            cwd: path.resolve(__dirname, '..', '..'),
            overrideConfigFile: path.resolve(__dirname, '..', '..', 'eslint.config.js')
        });

        const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

        const boundariesViolations = results.flatMap((result) =>
            result.messages
                .filter((m) => m.ruleId === 'boundaries/element-types')
                .map((m) => ({
                    file: path.relative(process.cwd(), result.filePath),
                    line: m.line,
                    message: m.message
                }))
        );

        // Print every violation found for debug-friendly failure output.
        if (boundariesViolations.length > 0) {
            console.error(
                `Found ${boundariesViolations.length} boundaries violation(s):\n` +
                    boundariesViolations
                        .map((v) => `  ${v.file}:${v.line}  ${v.message}`)
                        .join('\n')
            );
        }

        expect(boundariesViolations).toEqual([]);
    }, 60_000); // longer timeout — full lint can take 10-20s
});
