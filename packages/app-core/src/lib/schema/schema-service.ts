import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { mergician } from 'mergician';
import vegaSchema from 'vega/vega-schema.json';
import vegaLiteSchema from 'vega-lite/vega-lite-schema.json';
import draft06Schema from 'ajv/lib/refs/json-schema-draft-06.json';
import { VEGA_LITE_SCHEME_ADDITIONS } from '@deneb-viz/vega-runtime/extensibility';
import type {
    SchemaValidationResult,
    SchemaValidator
} from '@deneb-viz/vega-runtime/spec-processing';
import type { SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Module-level caches populated by initializeSchemas().
 * These are intentionally mutable module state — the lazy initialization
 * pattern is used throughout the codebase for expensive one-time operations.
 *
 * Tree-shaking note: This module is only imported by the editor UI path
 * (via editor-init-service). Viewer-only builds that never reference the
 * editor will have this entire module (and its heavy static imports)
 * eliminated by webpack.
 */
let schemasReady = false;
let initPromise: Promise<void> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processedSchemas: Record<string, any> = {};
let schemaValidators: Partial<Record<SpecProvider, SchemaValidator>> = {};

/**
 * Adds markdownDescription props to a schema object for Monaco editor
 * hover documentation support.
 * @see https://github.com/Microsoft/monaco-editor/issues/885
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addMarkdownProps = (value: any): any => {
    if (typeof value === 'object' && value !== null) {
        if (value.description) {
            value.markdownDescription = value.description;
        }
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                value[key] = addMarkdownProps(value[key]);
            }
        }
    }
    return value;
};

/**
 * Format AJV validation errors into human-readable strings.
 */
const formatValidationErrors = (
    errors: { instancePath: string; message?: string; schemaPath: string }[]
): string[] =>
    errors.map(
        (error) =>
            `Validation: ${error.instancePath} ${error.message} of ${error.schemaPath}`
    );

/**
 * Yield to the browser between heavy synchronous operations so that CSS
 * animations (ProgressBar), viewport updates, and event processing can
 * continue while schema initialization runs.
 */
const yieldToMain = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Perform the actual schema initialization work.
 * Uses static imports — tree-shaking removes this entire module
 * if the editor path is never referenced (e.g. viewer-only builds).
 *
 * Heavy operations are interleaved with yields so the browser can
 * animate the Suspense ProgressBar and process Power BI viewport
 * updates between chunks.
 */
const doInitialize = async (): Promise<void> => {
    // 1. Merge Power BI color schemes into Vega-Lite schema
    const vegaLiteSchemaWithPowerBI = mergician(
        structuredClone(vegaLiteSchema),
        {
            definitions: {
                Categorical: {
                    enum: [
                        ...vegaLiteSchema.definitions.Categorical.enum,
                        ...VEGA_LITE_SCHEME_ADDITIONS.categorical
                    ]
                },
                Diverging: {
                    enum: [
                        ...vegaLiteSchema.definitions.Diverging.enum,
                        ...VEGA_LITE_SCHEME_ADDITIONS.diverging
                    ]
                },
                SequentialMultiHue: {
                    enum: [
                        ...vegaLiteSchema.definitions.SequentialMultiHue.enum,
                        ...VEGA_LITE_SCHEME_ADDITIONS.sequential
                    ]
                }
            }
        }
    );
    await yieldToMain();

    // 2. Clone and enrich Vega schema with markdown hover docs
    processedSchemas.vega = addMarkdownProps(structuredClone(vegaSchema));
    await yieldToMain();

    // 3. Clone and enrich Vega-Lite schema with markdown hover docs
    processedSchemas.vegaLite = addMarkdownProps(
        structuredClone(vegaLiteSchemaWithPowerBI)
    );
    await yieldToMain();

    // 4. Compile AJV validators for each provider (yielding between each)
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    ajv.addMetaSchema(draft06Schema);
    ajv.addFormat('color-hex', () => true);

    const providers: SpecProvider[] = ['vega', 'vegaLite'];
    for (const provider of providers) {
        const compiledValidator = ajv.compile(processedSchemas[provider]);
        schemaValidators[provider] = (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spec: any
        ): SchemaValidationResult => {
            const valid = compiledValidator(spec);
            if (valid || !compiledValidator.errors) {
                return { valid: true, warnings: [] };
            }
            const warnings = formatValidationErrors(compiledValidator.errors);
            return { valid: false, warnings };
        };
        await yieldToMain();
    }

    schemasReady = true;
};

/**
 * Initialize all editor schemas. Processes the Vega/Vega-Lite JSON schemas
 * for Monaco editor support and pre-compiles AJV validators.
 *
 * Idempotent — safe to call multiple times; returns the same promise.
 */
export const initializeSchemas = (): Promise<void> => {
    if (schemasReady) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = doInitialize().catch((error) => {
        // Reset so callers can retry after a transient failure.
        // Without this a single rejection permanently poisons initPromise.
        initPromise = null;
        processedSchemas = {};
        schemaValidators = {};
        throw error;
    });
    return initPromise;
};

/**
 * Get the processed schema for Monaco editor diagnostics configuration.
 * Must be called after initializeSchemas() has resolved.
 */
export const getProcessedSchema = (provider: SpecProvider) => {
    if (!schemasReady) {
        throw new Error(
            'Schemas not initialized. Call initializeSchemas() first.'
        );
    }
    return processedSchemas[provider];
};

/**
 * Get the pre-compiled schema validator for a given provider.
 * Must be called after initializeSchemas() has resolved.
 */
export const getEditorSchemaValidator = (
    provider: SpecProvider
): SchemaValidator => {
    if (!schemasReady) {
        throw new Error(
            'Schemas not initialized. Call initializeSchemas() first.'
        );
    }
    const validator = schemaValidators[provider];
    if (!validator) {
        throw new Error(`No schema validator found for provider: ${provider}`);
    }
    return validator;
};

/**
 * Whether schemas have been initialized and are ready for use.
 */
export const areSchemasReady = (): boolean => schemasReady;
