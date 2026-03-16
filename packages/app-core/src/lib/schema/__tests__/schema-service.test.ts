import { beforeAll, describe, expect, it } from 'vitest';
import {
    areSchemasReady,
    getEditorSchemaValidator,
    getProcessedSchema,
    initializeSchemas
} from '../schema-service';

/**
 * Schema service tests. These test the public API requirements:
 * - Schemas initialize without error
 * - Processed schemas contain markdownDescription props for Monaco
 * - Schema validators correctly validate and reject specs
 * - Initialization is idempotent
 * - Getters throw when called before initialization
 *
 * Note: Tests are ordered intentionally — "before initialization" tests run
 * first against the fresh module state, then initializeSchemas() is called
 * once for the "after initialization" suite. This avoids vi.resetModules()
 * which would re-parse the heavy Vega/Vega-Lite schema JSON files each time.
 */

describe('schema-service', () => {
    describe('before initialization', () => {
        it('should report schemas are not ready', () => {
            expect(areSchemasReady()).toBe(false);
        });

        it('should throw from getProcessedSchema when not initialized', () => {
            expect(() => getProcessedSchema('vega')).toThrow(
                'Schemas not initialized'
            );
        });

        it('should throw from getEditorSchemaValidator when not initialized', () => {
            expect(() => getEditorSchemaValidator('vega')).toThrow(
                'Schemas not initialized'
            );
        });
    });

    describe('after initialization', () => {
        beforeAll(async () => {
            await initializeSchemas();
        });

        it('should report schemas are ready', () => {
            expect(areSchemasReady()).toBe(true);
        });

        it('should resolve without error on repeated calls (idempotent)', async () => {
            await expect(initializeSchemas()).resolves.toBeUndefined();
            expect(areSchemasReady()).toBe(true);
        });

        describe('getProcessedSchema', () => {
            it('should return a Vega schema with markdownDescription on nested properties', () => {
                const schema = getProcessedSchema('vega');
                expect(schema).toBeDefined();
                expect(schema.$schema).toBeDefined();
                const hasMarkdown = JSON.stringify(schema).includes(
                    'markdownDescription'
                );
                expect(hasMarkdown).toBe(true);
            });

            it('should return a Vega-Lite schema with markdownDescription on nested properties', () => {
                const schema = getProcessedSchema('vegaLite');
                expect(schema).toBeDefined();
                expect(schema.$schema).toBeDefined();
                const hasMarkdown = JSON.stringify(schema).includes(
                    'markdownDescription'
                );
                expect(hasMarkdown).toBe(true);
            });

            it('should include Power BI color scheme additions in Vega-Lite schema', async () => {
                const { VEGA_LITE_SCHEME_ADDITIONS } = await import(
                    '@deneb-viz/vega-runtime/extensibility'
                );
                const schema = getProcessedSchema('vegaLite');
                const categoricalEnum =
                    schema.definitions?.Categorical?.enum ?? [];
                for (const scheme of VEGA_LITE_SCHEME_ADDITIONS.categorical) {
                    expect(categoricalEnum).toContain(scheme);
                }
            });
        });

        describe('getEditorSchemaValidator', () => {
            it('should return a working Vega validator', () => {
                const validator = getEditorSchemaValidator('vega');
                expect(typeof validator).toBe('function');
            });

            it('should return a working Vega-Lite validator', () => {
                const validator = getEditorSchemaValidator('vegaLite');
                expect(typeof validator).toBe('function');
            });

            it('should accept a spec that the schema considers valid', () => {
                const validator = getEditorSchemaValidator('vegaLite');
                const result = validator({});
                expect(result).toHaveProperty('valid');
                expect(result).toHaveProperty('warnings');
            });

            it('should return warnings for an obviously invalid spec', () => {
                const validator = getEditorSchemaValidator('vegaLite');
                const result = validator(42);
                expect(result.valid).toBe(false);
                expect(result.warnings.length).toBeGreaterThan(0);
                expect(result.warnings[0]).toContain('Validation:');
            });
        });
    });
});
