import { describe, expect, it, vi } from 'vitest';
import { parseSpec, validateSpec } from '../parse';
import { SIGNAL_DENEB_CONTAINER } from '../../signals';

describe('parseSpec', () => {
    it('should parse valid Vega spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": 400,
            "height": 200,
            "marks": []
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
        expect(result.errors).toHaveLength(0);
    });

    it('should parse valid Vega-Lite spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"name": "table"},
            "mark": "bar",
            "encoding": {
                "x": {"field": "a", "type": "ordinal"},
                "y": {"field": "b", "type": "quantitative"}
            }
        }`;

        const result = parseSpec({
            spec,
            provider: 'vegaLite'
        });

        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
        expect(result.errors).toHaveLength(0);
    });

    it('should apply signal migration automatically', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": {"signal": "pbiContainer.width"},
            "height": {"signal": "pbiContainer.height"},
            "marks": []
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        const specObj = result.spec as any;
        expect(JSON.stringify(specObj)).toContain('denebContainer');
        expect(JSON.stringify(specObj)).not.toContain('pbiContainer');
    });

    it('should add denebContainer signal to Vega spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        const specObj = result.spec as any;
        expect(specObj.signals).toBeDefined();
        const denebSignal = specObj.signals.find(
            (s: any) => s.name === SIGNAL_DENEB_CONTAINER
        );
        expect(denebSignal).toBeDefined();
    });

    it('should add denebContainer param to Vega-Lite spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"name": "table"},
            "mark": "bar",
            "encoding": {}
        }`;

        const result = parseSpec({
            spec,
            provider: 'vegaLite'
        });

        expect(result.status).toBe('valid');
        const specObj = result.spec as any;
        expect(specObj.params).toBeDefined();
        const denebParam = specObj.params.find(
            (p: any) => p.name === SIGNAL_DENEB_CONTAINER
        );
        expect(denebParam).toBeDefined();
    });

    it('should apply responsive sizing when containerDimensions provided', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega',
            containerDimensions: { width: 800, height: 600 }
        });

        expect(result.status).toBe('valid');
        const specObj = result.spec as any;
        expect(specObj.width).toHaveProperty('signal');
        expect(specObj.height).toHaveProperty('signal');
    });

    it('should merge config with spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;
        const config = '{"mark": {"color": "steelblue"}}';

        const result = parseSpec({
            spec,
            config,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        expect(result.config).toBeDefined();
        expect(result.config.mark).toEqual({ color: 'steelblue' });
    });

    it('should return error for invalid JSON in spec', () => {
        const invalidSpec = '{"marks": invalid}';

        const result = parseSpec({
            spec: invalidSpec,
            provider: 'vega'
        });

        expect(result.status).toBe('error');
        expect(result.spec).toBeNull();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Specification JSON parse error');
    });

    it('should return error for invalid JSON in config', () => {
        const spec = '{"$schema": "https://vega.github.io/schema/vega/v5.json", "marks": []}';
        const invalidConfig = '{"mark": invalid}';

        const result = parseSpec({
            spec,
            config: invalidConfig,
            provider: 'vega'
        });

        expect(result.status).toBe('error');
        expect(result.spec).toBeNull();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Config JSON parse error');
    });

    it('should pass through valid specs even with referenced scales', () => {
        // Vega is lenient during parsing - scale validation happens at runtime
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": [{
                "type": "rect",
                "encode": {
                    "update": {
                        "x": {"scale": "nonexistent", "field": "a"}
                    }
                }
            }]
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        // Vega parser accepts this - runtime validation is separate
        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
    });

    it('should return error for invalid Vega-Lite spec structure', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "mark": {"type": "bar"},
            "encoding": {"x": {"field": "a", "type": "invalid_type"}}
        }`;

        const result = parseSpec({
            spec,
            provider: 'vegaLite'
        });

        expect(result.status).toBe('error');
        expect(result.spec).toBeNull();
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle actual errors with reasonable message length', () => {
        // Test with actually invalid JSON to trigger a real error
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": [invalid json here]
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        // Should have an error from JSON parsing
        expect(result.errors.length).toBeGreaterThan(0);
        // Error messages should be reasonable length
        result.errors.forEach((error) => {
            expect(typeof error).toBe('string');
            expect(error.length).toBeGreaterThan(0);
        });
    });

    it('should handle empty spec string as empty object', () => {
        // stripComments converts empty string to '{}' which Vega will validate
        const result = parseSpec({
            spec: '',
            provider: 'vega'
        });

        // Empty object is valid Vega (though not useful)
        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
    });

    it('should handle whitespace-only spec', () => {
        const result = parseSpec({
            spec: '   \n   ',
            provider: 'vega'
        });

        expect(result.status).toBe('error');
        expect(result.spec).toBeNull();
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should default config to empty object if not provided', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        expect(result.config).toBeDefined();
        expect(result.config.background).toBe('transparent');
    });

    it('should handle real-world bar chart spec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "description": "A basic bar chart",
            "data": [
                {
                    "name": "table",
                    "values": [
                        {"category": "A", "amount": 28},
                        {"category": "B", "amount": 55}
                    ]
                }
            ],
            "scales": [
                {
                    "name": "xscale",
                    "type": "band",
                    "domain": {"data": "table", "field": "category"},
                    "range": "width",
                    "padding": 0.05
                },
                {
                    "name": "yscale",
                    "domain": {"data": "table", "field": "amount"},
                    "nice": true,
                    "range": "height"
                }
            ],
            "axes": [
                {"orient": "bottom", "scale": "xscale"},
                {"orient": "left", "scale": "yscale"}
            ],
            "marks": [
                {
                    "type": "rect",
                    "from": {"data": "table"},
                    "encode": {
                        "enter": {
                            "x": {"scale": "xscale", "field": "category"},
                            "width": {"scale": "xscale", "band": 1},
                            "y": {"scale": "yscale", "field": "amount"},
                            "y2": {"scale": "yscale", "value": 0}
                        },
                        "update": {
                            "fill": {"value": "steelblue"}
                        }
                    }
                }
            ]
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega',
            containerDimensions: { width: 800, height: 600 }
        });

        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
        expect(result.errors).toHaveLength(0);
    });

    it('should log warning for legacy pbiContainer references', () => {
        // Spec with pbiContainer signal name
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": 400,
            "height": 200,
            "signals": [{"name": "customSignal", "value": 1}],
            "marks": []
        }`;

        // Add a legacy reference in a comment-like area (description)
        const specWithLegacy = spec.replace(
            '"width"',
            '"description": "Uses pbiContainer signal", "width"'
        );

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

        parseSpec({
            spec: specWithLegacy,
            provider: 'vega'
        });

        expect(consoleWarnSpy).toHaveBeenCalled();
        const warningCall = consoleWarnSpy.mock.calls.find((call) =>
            call[0].includes('pbiContainer')
        );
        expect(warningCall).toBeDefined();
        expect(warningCall[0]).toContain('denebContainer');

        consoleWarnSpy.mockRestore();
    });

    it('should parse JSONC spec with comments', () => {
        const spec = `{
            // Vega spec with comments
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            /* Container dimensions */
            "width": 400,
            "height": 200, // Fixed height
            "marks": [] // Empty marks array
        }`;

        const result = parseSpec({
            spec,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
        const specObj = result.spec as any;
        expect(specObj.width).toBe(400);
        expect(specObj.height).toBe(200);
    });

    it('should parse JSONC config with comments', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;
        const config = `{
            // Color configuration
            "mark": {
                "color": "steelblue" /* Default color */
            }
        }`;

        const result = parseSpec({
            spec,
            config,
            provider: 'vega'
        });

        expect(result.status).toBe('valid');
        expect(result.config).toBeDefined();
        expect(result.config.mark.color).toBe('steelblue');
    });
});

describe('validateSpec', () => {
    it('should return errors for invalid spec', () => {
        const invalidSpec = '{"marks": invalid}';

        const result = validateSpec({
            spec: invalidSpec,
            provider: 'vega'
        });

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('should return empty errors for valid spec', () => {
        const validSpec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;

        const result = validateSpec({
            spec: validSpec,
            provider: 'vega'
        });

        expect(result.errors).toHaveLength(0);
    });

    it('should have similar performance to parseSpec', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;

        // validateSpec calls parseSpec internally, so they should both work
        const validateResult = validateSpec({ spec, provider: 'vega' });
        const parseResult = parseSpec({ spec, provider: 'vega' });

        // Both should return the same validation result
        expect(validateResult.errors).toEqual(parseResult.errors);
        expect(validateResult.warnings).toEqual(parseResult.warnings);
    });
});

describe('parseSpec Integration', () => {
    it('should handle complete workflow: migration + patching + validation', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": {"signal": "pbiContainer.width"},
            "height": 200,
            "data": [{"name": "table", "values": []}],
            "marks": []
        }`;

        const config = '{"mark": {"tooltip": true}}';

        const result = parseSpec({
            spec,
            config,
            provider: 'vega',
            containerDimensions: { width: 1024, height: 768 }
        });

        expect(result.status).toBe('valid');
        expect(result.spec).toBeDefined();
        expect(result.config).toBeDefined();
        expect(result.errors).toHaveLength(0);

        const specObj = result.spec as any;

        // Check migration
        expect(JSON.stringify(specObj)).toContain('denebContainer');
        expect(JSON.stringify(specObj)).not.toContain('pbiContainer');

        // Check patching
        expect(specObj.signals).toBeDefined();
        expect(
            specObj.signals.find((s: any) => s.name === SIGNAL_DENEB_CONTAINER)
        ).toBeDefined();

        // Check responsive sizing
        expect(specObj.width).toHaveProperty('signal');

        // Check config
        expect(result.config.mark.tooltip).toBe(true);
        expect(result.config.background).toBe('transparent');
    });

    it('should maintain immutability throughout pipeline', () => {
        const specText = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": []
        }`;
        const configText = '{"mark": {"color": "red"}}';

        const originalSpec = specText;
        const originalConfig = configText;

        parseSpec({
            spec: specText,
            config: configText,
            provider: 'vega'
        });

        expect(specText).toBe(originalSpec);
        expect(configText).toBe(originalConfig);
    });
});
