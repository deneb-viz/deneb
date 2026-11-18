import { beforeAll, describe, expect, it } from 'vitest';
import {
    areSchemasReady,
    getConfigSchema,
    getEditorSchemaValidator,
    getProcessedSchema,
    initializeSchemas
} from '../schema-service';
import {
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings
} from '@deneb-viz/vega-runtime/spec-processing';

/**
 * Schema service tests. These test the public API requirements:
 * - Schemas initialize without error
 * - Processed schemas contain markdownDescription props for Monaco
 * - Config schemas describe the `deneb` key and leave the spec schemas as
 *   they are
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

        it('should throw from getConfigSchema when not initialized', () => {
            expect(() => getConfigSchema('vega')).toThrow(
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
            // Vega's schema has no text descriptions, so it gains no hover
            // documentation.
            it('should return a Vega schema', () => {
                const schema = getProcessedSchema('vega');
                expect(schema).toBeDefined();
                expect(schema.$schema).toBeDefined();
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

            it('should add hover documentation as text only, never as a property called markdownDescription', () => {
                for (const provider of ['vega', 'vegaLite'] as const) {
                    const notText: unknown[] = [];
                    const seen = new Set<object>();
                    const walk = (node: unknown) => {
                        if (typeof node !== 'object' || node === null) return;
                        if (seen.has(node)) return;
                        seen.add(node);
                        const { markdownDescription } = node as {
                            markdownDescription?: unknown;
                        };
                        if (
                            markdownDescription !== undefined &&
                            typeof markdownDescription !== 'string'
                        ) {
                            notText.push(node);
                        }
                        Object.values(node).forEach(walk);
                    };
                    walk(getProcessedSchema(provider));
                    expect(notText).toHaveLength(0);
                }
                expect(
                    getProcessedSchema('vegaLite').definitions.TopLevelUnitSpec
                        .properties.description.markdownDescription
                ).toEqual(expect.any(String));
            });

            it('should include Power BI color scheme additions in Vega-Lite schema', async () => {
                const { VEGA_LITE_SCHEME_ADDITIONS } =
                    await import('@deneb-viz/vega-runtime/extensibility');
                const schema = getProcessedSchema('vegaLite');
                const categoricalEnum =
                    schema.definitions?.Categorical?.enum ?? [];
                for (const scheme of VEGA_LITE_SCHEME_ADDITIONS.categorical) {
                    expect(categoricalEnum).toContain(scheme);
                }
            });
        });

        describe('getConfigSchema', () => {
            const bindingsOf = (provider: 'vega' | 'vegaLite') =>
                getConfigSchema(provider).properties.deneb.properties.bindings;

            it('should describe the deneb key at the root of a Vega-Lite config, beside the rest of the config', () => {
                const schema = getConfigSchema('vegaLite');
                expect(bindingsOf('vegaLite').properties.orient.enum).toEqual([
                    'top',
                    'bottom',
                    'left',
                    'right'
                ]);
                expect(schema.properties.background).toBeDefined();
                expect(schema.properties.axis).toBeDefined();
                expect(schema.additionalProperties).toBe(false);
            });

            it("should share the Vega-Lite spec schema's definitions unchanged, so that a spec's inline config is not offered the deneb key", () => {
                const specSchema = getProcessedSchema('vegaLite');
                expect(getConfigSchema('vegaLite').definitions).toBe(
                    specSchema.definitions
                );
                expect(
                    specSchema.definitions.Config.properties.deneb
                ).toBeUndefined();
            });

            it('should describe only the deneb key for a Vega config and allow anything else', () => {
                const schema = getConfigSchema('vega');
                expect(Object.keys(schema.properties)).toEqual(['deneb']);
                expect(schema.additionalProperties).toBeUndefined();
            });

            it('should describe all eleven bindings settings and no other key', () => {
                const bindings = bindingsOf('vega');
                expect(Object.keys(bindings.properties).sort()).toEqual([
                    'accentColor',
                    'background',
                    'borderColor',
                    'collapsed',
                    'collapsible',
                    'color',
                    'float',
                    'fontFamily',
                    'fontSize',
                    'maxSize',
                    'orient'
                ]);
                expect(bindings.additionalProperties).toBe(false);
                expect(
                    getConfigSchema('vega').properties.deneb
                        .additionalProperties
                ).toBe(false);
            });

            it('should describe only settings that the parser of the settings recognises', () => {
                for (const key of Object.keys(bindingsOf('vega').properties)) {
                    expect(
                        extractBindingsSettings({
                            deneb: { bindings: { [key]: undefined } }
                        }).warnings
                    ).toEqual([]);
                }
            });

            it('should find every reference in the Vega-Lite spec schema inside its definitions, so that both schemas resolve each one to the same object', () => {
                const refs: string[] = [];
                const seen = new Set<object>();
                const walk = (node: unknown) => {
                    if (typeof node !== 'object' || node === null) return;
                    if (seen.has(node)) return;
                    seen.add(node);
                    const { $ref } = node as { $ref?: unknown };
                    if (typeof $ref === 'string') refs.push($ref);
                    Object.values(node).forEach(walk);
                };
                walk(getProcessedSchema('vegaLite'));
                expect(refs.length).toBeGreaterThan(0);
                expect(
                    refs.filter((ref) => !/^#\/definitions\/[^/]+$/.test(ref))
                ).toEqual([]);
                expect(getConfigSchema('vegaLite').$ref).toBeUndefined();
            });

            it('should offer the defaults that the parser of the settings uses', () => {
                const { properties } = bindingsOf('vega');
                for (const key of [
                    'orient',
                    'float',
                    'collapsible',
                    'collapsed',
                    'maxSize'
                ] as const) {
                    expect(properties[key].default).toBe(
                        DEFAULT_BINDINGS_SETTINGS[key]
                    );
                }
            });

            it('should give the numbers the limits that the parser of the settings uses', () => {
                const { fontSize, maxSize } = bindingsOf('vega').properties;
                const isAccepted = (key: string, value: number) =>
                    extractBindingsSettings({
                        deneb: { bindings: { [key]: value } }
                    }).warnings.length === 0;
                expect(isAccepted('fontSize', fontSize.minimum)).toBe(true);
                expect(isAccepted('fontSize', fontSize.minimum - 0.01)).toBe(
                    false
                );
                expect(isAccepted('fontSize', fontSize.maximum)).toBe(true);
                expect(isAccepted('fontSize', fontSize.maximum + 0.01)).toBe(
                    false
                );
                expect(isAccepted('maxSize', maxSize.exclusiveMinimum)).toBe(
                    false
                );
                expect(
                    isAccepted('maxSize', maxSize.exclusiveMinimum + 0.01)
                ).toBe(true);
                expect(isAccepted('maxSize', maxSize.maximum)).toBe(true);
                expect(isAccepted('maxSize', maxSize.maximum + 0.01)).toBe(
                    false
                );
            });

            it('should add hover documentation to every bindings setting', () => {
                const { properties } = bindingsOf('vega');
                for (const key of Object.keys(properties)) {
                    expect(properties[key].markdownDescription).toBeTruthy();
                }
            });

            it('should say what a colour and a font family may be', () => {
                const { properties } = bindingsOf('vega');
                for (const key of [
                    'color',
                    'accentColor',
                    'background',
                    'borderColor'
                ]) {
                    expect(properties[key].description).toContain('`var()`');
                }
                expect(properties.fontFamily.description).toContain(
                    'separated by commas'
                );
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

            it('should accept a minimal valid Vega-Lite spec', () => {
                const validator = getEditorSchemaValidator('vegaLite');
                // TopLevelUnitSpec requires both mark and data.
                const result = validator({
                    mark: 'bar',
                    data: { values: [] }
                });
                expect(result.valid).toBe(true);
                expect(result.warnings).toHaveLength(0);
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
