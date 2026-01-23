import { parse as parseVega, type Spec } from 'vega';
import { compile as compileVegaLite, type TopLevelSpec } from 'vega-lite';
import { parseJsonWithResult, redactJsonFromError } from './json';
import { patchConfig } from './patch-config';
import { patchVegaSpec } from './patch-vega';
import { patchVegaLiteSpec } from './patch-vega-lite';
import {
    replaceLegacySignalReferences,
    logLegacySignalWarning
} from '../signals';
import type { ParseSpecOptions, ParsedSpec } from './types';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Parse, validate, and patch a Vega or Vega-Lite specification, which is the main entry point for spec processing.
 *
 * Process flow:
 * 1. Apply legacy signal migration (`pbiContainer` > `denebContainer`)
 * 2. Parse JSON for spec and config
 * 3. Patch config with Deneb defaults
 * 4. Patch spec with `denebContainer` signal and responsive sizing
 * 5. Schema validation (if schemaValidator provided)
 * 6. Validate with Vega/Vega-Lite compiler
 *
 * @param options Parsing options
 * @returns Parsed specification result
 *
 * @example
 * ```typescript
 * const result = parseSpec({
 *   spec: '{ "$schema": "...", ... }',
 *   config: '{}',
 *   provider: 'vega',
 *   schemaValidator: createSchemaValidator('vega'),
 *   containerDimensions: { width: 800, height: 600 }
 * });
 *
 * if (result.status === 'valid') {
 *   // Use result.spec
 * } else {
 *   // Handle result.errors
 * }
 * ```
 */
export const parseSpec = (options: ParseSpecOptions): ParsedSpec => {
    const {
        spec: specText,
        config: configText = PROJECT_DEFAULTS.config,
        provider,
        containerDimensions,
        schemaValidator
    } = options;

    const warnings: string[] = [];

    // Step 1: Apply legacy signal migration
    const migration = replaceLegacySignalReferences(specText);
    if (migration.hadLegacyReferences) {
        logLegacySignalWarning(migration.replacementCount);
        warnings.push(
            `Migrated ${migration.replacementCount} legacy pbiContainer signal reference(s) to denebContainer.`
        );
    }

    // Step 2: Parse JSON
    const parsedSpec = parseJsonWithResult(migration.spec);
    const parsedConfig = patchConfig(configText);

    // Check for JSON parse errors
    if (parsedSpec.errors.length > 0) {
        return {
            status: 'error',
            spec: null,
            config: null,
            errors: ['Specification JSON parse error:', ...parsedSpec.errors],
            warnings
        };
    }

    if (parsedConfig.errors.length > 0) {
        return {
            status: 'error',
            spec: null,
            config: null,
            errors: ['Config JSON parse error:', ...parsedConfig.errors],
            warnings
        };
    }

    // Step 3: Patch spec with denebContainer and responsive sizing
    const patchedSpec =
        provider === 'vega'
            ? patchVegaSpec(parsedSpec.result as Spec, {
                  containerDimensions
              })
            : patchVegaLiteSpec(parsedSpec.result as TopLevelSpec, {
                  containerDimensions
              });

    // Step 4: Merge config into spec for validation
    const specWithConfig = {
        ...patchedSpec,
        config: parsedConfig.result || {}
    };

    // Step 5: Schema validation (if validator provided)
    if (schemaValidator) {
        const schemaResult = schemaValidator(specWithConfig);
        if (!schemaResult.valid && schemaResult.warnings.length > 0) {
            warnings.push(...schemaResult.warnings);
        }
    }

    // Step 6: Validate with Vega/Vega-Lite compiler
    try {
        if (provider === 'vega') {
            parseVega(specWithConfig as Spec);
        } else {
            compileVegaLite(specWithConfig as TopLevelSpec);
        }

        return {
            status: 'valid',
            spec: patchedSpec,
            config: parsedConfig.result,
            errors: [],
            warnings
        };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const redactedMessage = redactJsonFromError(message);

        return {
            status: 'error',
            spec: null,
            config: parsedConfig.result,
            errors: [redactedMessage],
            warnings
        };
    }
};

/**
 * Parse a spec and return only errors/warnings for quick validation.
 * Useful for linting scenarios where you don't need the full parsed result.
 *
 * @param options Parsing options
 * @returns Object with errors and warnings arrays
 */
export const validateSpec = (
    options: ParseSpecOptions
): { errors: string[]; warnings: string[] } => {
    const result = parseSpec(options);
    return {
        errors: result.errors,
        warnings: result.warnings
    };
};
