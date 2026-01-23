import { describe, it, expect } from 'vitest';
import { buildEmbedOptions } from '../embed-options';
import type { BuildEmbedOptionsInput } from '../types';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

describe('buildEmbedOptions', () => {
    it('should create default Vega embed options', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result).toEqual({
            mode: 'vega',
            actions: false,
            renderer: 'svg',
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should create default Vega-Lite embed options', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega-lite'
        };

        const result = buildEmbedOptions(input);

        expect(result).toEqual({
            mode: 'vega-lite',
            actions: false,
            renderer: 'svg',
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should merge config into embed options', () => {
        const config = {
            background: 'transparent',
            mark: { color: 'steelblue' }
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            config
        };

        const result = buildEmbedOptions(input);

        expect(result.config).toEqual(config);
    });

    it('should merge user options with defaults', () => {
        const userOptions = {
            padding: { top: 10, bottom: 10, left: 10, right: 10 },
            tooltip: true
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            userOptions
        };

        const result = buildEmbedOptions(input);

        expect(result.padding).toEqual(userOptions.padding);
        expect(result.tooltip).toBe(true);
        // Defaults should still be present
        expect(result.actions).toBe(false);
        expect(result.renderer).toBe('svg');
    });

    it('should allow user options to override defaults', () => {
        const userOptions = {
            actions: true,
            renderer: 'canvas' as const
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            userOptions
        };

        const result = buildEmbedOptions(input);

        expect(result.actions).toBe(true);
        expect(result.renderer).toBe('canvas');
    });

    it('should set custom log level', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            logLevel: 3
        };

        const result = buildEmbedOptions(input);

        expect(result.logLevel).toBe(3);
    });

    it('should default logLevel to PROJECT_DEFAULTS.logLevel', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result.logLevel).toBe(PROJECT_DEFAULTS.logLevel);
    });

    it('should merge all options together', () => {
        const config = {
            background: 'transparent',
            customFormatTypes: true
        };

        const userOptions = {
            padding: 5,
            tooltip: { theme: 'dark' as const }
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega-lite',
            config,
            userOptions,
            logLevel: 2
        };

        const result = buildEmbedOptions(input);

        expect(result).toMatchObject({
            mode: 'vega-lite',
            actions: false,
            renderer: 'svg',
            loader: undefined,
            logLevel: 2,
            config,
            padding: 5,
            tooltip: { theme: 'dark' }
        });
    });

    it('should handle empty config', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            config: {}
        };

        const result = buildEmbedOptions(input);

        expect(result.config).toEqual({});
    });

    it('should handle complex nested config', () => {
        const config = {
            mark: {
                tooltip: true,
                color: 'steelblue'
            },
            axis: {
                labelFontSize: 12,
                titleFontSize: 14
            }
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            config
        };

        const result = buildEmbedOptions(input);

        expect(result.config).toEqual(config);
    });

    it('should preserve original input objects', () => {
        const config = { background: 'white' };
        const userOptions = { padding: 10 };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            config,
            userOptions
        };

        buildEmbedOptions(input);

        // Original objects should remain unchanged
        expect(config).toEqual({ background: 'white' });
        expect(userOptions).toEqual({ padding: 10 });
    });

    it('should handle complex user options', () => {
        const userOptions = {
            downloadFileName: 'my-visualization',
            scaleFactor: 2,
            tooltip: {
                theme: 'custom' as const,
                offsetX: 10,
                offsetY: 10
            }
        };

        const input: BuildEmbedOptionsInput = {
            mode: 'vega-lite',
            userOptions
        };

        const result = buildEmbedOptions(input);

        expect(result.downloadFileName).toBe('my-visualization');
        expect(result.scaleFactor).toBe(2);
        expect(result.tooltip).toEqual(userOptions.tooltip);
    });

    it('should not include config when not provided', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result).not.toHaveProperty('config');
    });

    it('should set renderer to svg for Power BI compatibility', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result.renderer).toBe('svg');
    });

    it('should disable actions menu by default', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result.actions).toBe(false);
    });
});
