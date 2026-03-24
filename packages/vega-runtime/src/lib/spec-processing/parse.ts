import { parse as parseVega, type Spec } from 'vega';
import { compile as compileVegaLite, type TopLevelSpec } from 'vega-lite';
import { parseJsonWithResult, redactJsonFromError } from './json';
import { patchConfig } from './patch-config';
import { patchVegaSpec } from './patch-vega';
import {
    patchVegaLiteSpec,
    patchVegaLiteResponsiveSizing
} from './patch-vega-lite';
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
 * 3. Patch spec with `denebContainer` signal and responsive sizing
 * 4. Schema validation (if schemaValidator provided)
 * 5. Validate patched spec (Vega: parser, VL: compile)
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

    // Step 4a: Schema validation (if validator provided)
    if (schemaValidator) {
        const schemaResult = schemaValidator(specWithConfig);
        if (!schemaResult.valid && schemaResult.warnings.length > 0) {
            warnings.push(...schemaResult.warnings);
        }
    }

    // Step 5: Validate patched spec with the appropriate compiler/parser.
    // Vega: parse with Vega parser. VL: compile with vega-lite to catch conflicts
    // introduced by patchVegaLiteSpec (e.g. duplicate param names like denebContainer).
    try {
        if (provider === 'vega') {
            parseVega(specWithConfig as Spec);
        } else {
            compileVegaLite(specWithConfig as TopLevelSpec);
        }
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

    return {
        status: 'valid',
        spec: patchedSpec,
        config: parsedConfig.result,
        errors: [],
        warnings
    };
};

/**
 * Compile a Vega-Lite spec into Vega, applying responsive sizing but excluding
 * the denebContainer signal. Intended for lazy/on-demand use (e.g. when the
 * compiled Vega pane is opened) rather than on every keystroke.
 *
 * @param spec The parsed Vega-Lite spec (pre-patch, without denebContainer)
 * @param config The parsed config object
 * @returns The compiled Vega spec, or undefined if compilation fails
 */
export const compileCleanVgSpec = (
    spec: TopLevelSpec,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any
): Spec | undefined => {
    try {
        const sizedSpec = patchVegaLiteResponsiveSizing(spec);
        const sizedSpecWithConfig = {
            ...sizedSpec,
            config: config || {}
        };
        const compiled = compileVegaLite(
            sizedSpecWithConfig as TopLevelSpec
        );
        return compiled.spec;
    } catch {
        return undefined;
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
