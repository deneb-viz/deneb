import { describe, expect, it } from 'vitest';
import { patchConfig } from '../patch-config';

describe('patchConfig', () => {
    it('should apply default config to empty object', () => {
        const result = patchConfig('{}');

        expect(result.errors).toHaveLength(0);
        expect(result.result).toHaveProperty('background', 'transparent');
        expect(result.result).toHaveProperty('customFormatTypes', true);
    });

    it('should merge user config with defaults', () => {
        const userConfig = '{"mark": {"color": "steelblue"}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toHaveProperty('background', 'transparent');
        expect(result.result).toHaveProperty('customFormatTypes', true);
        expect(result.result).toHaveProperty('mark');
        expect(result.result.mark).toEqual({ color: 'steelblue' });
    });

    it('should preserve user background if specified', () => {
        const userConfig = '{"background": "white"}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.background).toBe('white');
    });

    it('should remove container width', () => {
        const userConfig = '{"width": "container", "mark": {"color": "red"}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result).not.toHaveProperty('width');
        expect(result.result.mark).toEqual({ color: 'red' });
    });

    it('should remove container height', () => {
        const userConfig =
            '{"height": "container", "mark": {"color": "blue"}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result).not.toHaveProperty('height');
        expect(result.result.mark).toEqual({ color: 'blue' });
    });

    it('should preserve numeric width', () => {
        const userConfig = '{"width": 400}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.width).toBe(400);
    });

    it('should preserve numeric height', () => {
        const userConfig = '{"height": 300}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.height).toBe(300);
    });

    it('should disable autosize.resize if true', () => {
        const userConfig = '{"autosize": {"type": "fit", "resize": true}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.autosize.type).toBe('fit');
        expect(result.result.autosize.resize).toBe(false);
    });

    it('should preserve autosize.resize if false', () => {
        const userConfig = '{"autosize": {"resize": false}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.autosize.resize).toBe(false);
    });

    it('should preserve other autosize properties', () => {
        const userConfig =
            '{"autosize": {"type": "pad", "contains": "padding"}}';
        const result = patchConfig(userConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.autosize.type).toBe('pad');
        expect(result.result.autosize.contains).toBe('padding');
    });

    it('should return error for invalid JSON', () => {
        const invalidConfig = '{"mark": invalid}';
        const result = patchConfig(invalidConfig);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.result).toBeNull();
    });

    it('should handle empty string as empty config with defaults', () => {
        // stripComments converts empty string to '{}' which is valid
        const result = patchConfig('');

        expect(result.errors).toHaveLength(0);
        expect(result.result).toBeDefined();
        // Should apply Deneb defaults even for empty config
        expect(result.result.background).toBe('transparent');
    });

    it('should handle complex nested config', () => {
        const complexConfig = `{
            "mark": {"tooltip": true},
            "axis": {
                "labelFontSize": 12,
                "titleFontSize": 14
            },
            "legend": {
                "orient": "right"
            }
        }`;

        const result = patchConfig(complexConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.background).toBe('transparent');
        expect(result.result.mark.tooltip).toBe(true);
        expect(result.result.axis.labelFontSize).toBe(12);
        expect(result.result.legend.orient).toBe('right');
    });

    it('should handle all problematic properties together', () => {
        const config = `{
            "width": "container",
            "height": "container",
            "autosize": {"resize": true, "type": "fit"},
            "mark": {"color": "green"}
        }`;

        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        expect(result.result).not.toHaveProperty('width');
        expect(result.result).not.toHaveProperty('height');
        expect(result.result.autosize.resize).toBe(false);
        expect(result.result.autosize.type).toBe('fit');
        expect(result.result.mark.color).toBe('green');
    });

    it('should maintain immutability - not modify input', () => {
        const originalInput = '{"mark": {"color": "red"}}';
        patchConfig(originalInput);

        // Input string should remain unchanged
        expect(originalInput).toBe('{"mark": {"color": "red"}}');
    });

    it('should handle config with comments (JSONC)', () => {
        // JSONC parser should handle comments
        const configWithComments = '{"mark": {"color": "steelblue"} /* comment */}';
        const result = patchConfig(configWithComments);

        expect(result.errors).toHaveLength(0);
        expect(result.result).toBeDefined();
        expect(result.result.mark.color).toBe('steelblue');
    });

    it('should preserve customFormatTypes if user sets false', () => {
        const config = '{"customFormatTypes": false}';
        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        // User setting should override default
        expect(result.result.customFormatTypes).toBe(false);
    });

    it('should handle Vega-Lite specific config', () => {
        const vlConfig = `{
            "view": {"strokeWidth": 0},
            "concat": {"spacing": 10}
        }`;

        const result = patchConfig(vlConfig);

        expect(result.errors).toHaveLength(0);
        expect(result.result.view.strokeWidth).toBe(0);
        expect(result.result.concat.spacing).toBe(10);
    });
});

describe('patchConfig Edge Cases', () => {
    it('should handle null autosize', () => {
        const config = '{"autosize": null}';
        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        expect(result.result.autosize).toBeNull();
    });

    it('should handle autosize without resize property', () => {
        const config = '{"autosize": {"type": "fit"}}';
        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        expect(result.result.autosize).toEqual({ type: 'fit' });
    });

    it('should handle deep nesting', () => {
        const config = `{
            "level1": {
                "level2": {
                    "level3": {
                        "value": 42
                    }
                }
            }
        }`;

        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        expect(result.result.level1.level2.level3.value).toBe(42);
    });

    it('should handle arrays in config', () => {
        const config = `{
            "scale": {
                "domain": [0, 100],
                "range": ["red", "blue"]
            }
        }`;

        const result = patchConfig(config);

        expect(result.errors).toHaveLength(0);
        expect(result.result.scale.domain).toEqual([0, 100]);
        expect(result.result.scale.range).toEqual(['red', 'blue']);
    });
});
