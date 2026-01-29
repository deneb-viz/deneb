import { mergician } from 'mergician';
import { parseJsonWithResult } from './json';
import type { ContentPatchResult } from './types';

/**
 * Parse and patch a Vega/Vega-Lite config with Deneb defaults.
 *
 * Default config patches:
 * 1. background: 'transparent' - Defer to host element background, e.g., Power BI report page
 * 2. customFormatTypes: true - Enable custom formatting
 * 3. Removes container width/height if present (handled by spec patching)
 * 4. Removes autosize.resize if true (handled by spec patching)
 *
 * @param content Config JSON string
 * @returns Patch result with parsed/patched config or errors
 *
 * @example
 * ```typescript
 * const result = patchConfig('{ "mark": { "color": "steelblue" } }');
 * if (result.errors.length === 0) {
 *   // Use result.result
 * }
 * ```
 */
export const patchConfig = (content: string): ContentPatchResult => {
    try {
        // Parse JSON
        const parsed = parseJsonWithResult(content);
        if (parsed.errors.length > 0) {
            return parsed;
        }

        // Apply default config
        const patched = mergician(
            {
                background: 'transparent',
                customFormatTypes: true
            },
            parsed.result || {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;

        // Remove problematic container-related settings that conflict with spec patching
        // (#514, #525): Users sometimes set these in config, which conflicts with our
        // responsive sizing strategy. We handle these in the spec itself.
        if (patched.width === 'container') {
            delete patched.width;
        }

        if (patched.height === 'container') {
            delete patched.height;
        }

        if (patched.autosize?.resize === true) {
            patched.autosize.resize = false;
        }

        return {
            result: patched,
            errors: []
        };
    } catch (e) {
        return {
            result: null,
            errors: [e instanceof Error ? e.message : String(e)]
        };
    }
};
