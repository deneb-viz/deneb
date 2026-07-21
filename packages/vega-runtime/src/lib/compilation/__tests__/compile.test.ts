import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compileSpec, validateCompilation } from '../compile';
import { parseSpec } from '../../spec-processing/parse';
import { buildEmbedOptions } from '../embed-options';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import type { CompileSpecOptions } from '../types';

// Mock the dependencies
vi.mock('../../spec-processing/parse', () => ({
    parseSpec: vi.fn()
}));

vi.mock('../embed-options', () => ({
    buildEmbedOptions: vi.fn()
}));

describe('compileSpec', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully compile a Vega spec', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: { $schema: 'https://vega.github.io/schema/vega/v5.json' },
            config: {},
            errors: [],
            warnings: []
        };

        const mockEmbedOptions = {
            mode: 'vega' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue(mockEmbedOptions);

        const options: CompileSpecOptions = {
            spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json"}',
            config: '{}',
            provider: 'vega',
            containerDimensions: { width: 800, height: 600 }
        };

        const result = compileSpec(options);

        expect(result.status).toBe('ready');
        expect(result.parsed).toEqual(mockParsedSpec);
        expect(result.embedOptions).toEqual(mockEmbedOptions);
        expect(result.errors).toBeUndefined();

        expect(parseSpec).toHaveBeenCalledWith({
            spec: options.spec,
            config: options.config,
            provider: options.provider,
            containerDimensions: options.containerDimensions
        });

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega',
            config: {},
            userOptions: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should successfully compile a Vega-Lite spec', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json'
            },
            config: { background: 'white' },
            errors: [],
            warnings: []
        };

        const mockEmbedOptions = {
            mode: 'vega-lite' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel,
            config: { background: 'white' }
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue(mockEmbedOptions);

        const options: CompileSpecOptions = {
            spec: '{"$schema": "https://vega.github.io/schema/vega-lite/v5.json"}',
            config: '{"background": "white"}',
            provider: 'vegaLite'
        };

        const result = compileSpec(options);

        expect(result.status).toBe('ready');
        expect(result.parsed).toEqual(mockParsedSpec);
        expect(result.embedOptions).toEqual(mockEmbedOptions);

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega-lite',
            config: { background: 'white' },
            userOptions: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should return error status when parsing fails', () => {
        const mockParsedSpec = {
            status: 'error' as const,
            spec: null,
            config: null,
            errors: ['Invalid JSON: Unexpected token'],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{invalid json}',
            config: '{}',
            provider: 'vega'
        };

        const result = compileSpec(options);

        expect(result.status).toBe('error');
        expect(result.parsed).toEqual(mockParsedSpec);
        expect(result.embedOptions).toEqual({});
        expect(result.errors).toEqual(['Invalid JSON: Unexpected token']);

        expect(parseSpec).toHaveBeenCalled();
        expect(buildEmbedOptions).not.toHaveBeenCalled();
    });

    it('should pass custom log level to embed options', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        const mockEmbedOptions = {
            mode: 'vega' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: 3
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue(mockEmbedOptions);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega',
            logLevel: 3
        };

        const result = compileSpec(options);

        expect(result.status).toBe('ready');

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega',
            config: {},
            userOptions: undefined,
            logLevel: 3
        });
    });

    it('should pass user embed options to buildEmbedOptions', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        const userEmbedOptions = {
            renderer: 'canvas' as const,
            padding: 10
        };

        const mockEmbedOptions = {
            mode: 'vega' as const,
            actions: false,
            renderer: 'canvas' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel,
            padding: 10
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue(mockEmbedOptions);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega',
            embedOptions: userEmbedOptions
        };

        const result = compileSpec(options);

        expect(result.status).toBe('ready');

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega',
            config: {},
            userOptions: userEmbedOptions,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should default log level to 0 when not specified', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        const mockEmbedOptions = {
            mode: 'vega' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue(mockEmbedOptions);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega'
        };

        compileSpec(options);

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega',
            config: {},
            userOptions: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });

    it('should pass all parse options to parseSpec', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue({
            mode: 'vega' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });

        const mockSchemaValidator = vi.fn().mockReturnValue({
            valid: true,
            warnings: []
        });

        const options: CompileSpecOptions = {
            spec: '{}',
            config: '{"background": "transparent"}',
            provider: 'vega',
            schemaValidator: mockSchemaValidator,
            containerDimensions: { width: 1024, height: 768 },
            logLevel: 2,
            embedOptions: { padding: 5 }
        };

        compileSpec(options);

        expect(parseSpec).toHaveBeenCalledWith({
            spec: '{}',
            config: '{"background": "transparent"}',
            provider: 'vega',
            schemaValidator: mockSchemaValidator,
            containerDimensions: { width: 1024, height: 768 }
        });
    });

    it('should handle parsing errors with multiple error messages', () => {
        const mockParsedSpec = {
            status: 'error' as const,
            spec: null,
            config: null,
            errors: [
                'Error 1: Invalid specification',
                'Error 2: Missing required field'
            ],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{invalid}',
            provider: 'vega'
        };

        const result = compileSpec(options);

        expect(result.status).toBe('error');
        expect(result.errors).toEqual([
            'Error 1: Invalid specification',
            'Error 2: Missing required field'
        ]);
    });

    it('should use parsed config in embed options', () => {
        const mockConfig = {
            background: 'transparent',
            customFormatTypes: true,
            mark: { color: 'steelblue' }
        };

        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: mockConfig,
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);
        vi.mocked(buildEmbedOptions).mockReturnValue({
            mode: 'vega' as const,
            actions: false,
            renderer: 'svg' as const,
            loader: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel,
            config: mockConfig
        });

        const options: CompileSpecOptions = {
            spec: '{}',
            config: JSON.stringify(mockConfig),
            provider: 'vega'
        };

        compileSpec(options);

        expect(buildEmbedOptions).toHaveBeenCalledWith({
            mode: 'vega',
            config: mockConfig,
            userOptions: undefined,
            logLevel: PROJECT_DEFAULTS.logLevel
        });
    });
});

describe('validateCompilation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty array for valid spec', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega'
        };

        const errors = validateCompilation(options);

        expect(errors).toEqual([]);
        expect(parseSpec).toHaveBeenCalledWith({
            spec: '{}',
            provider: 'vega'
        });
    });

    it('should return errors array for invalid spec', () => {
        const mockParsedSpec = {
            status: 'error' as const,
            spec: null,
            config: null,
            errors: ['Invalid JSON: Unexpected token'],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{invalid}',
            provider: 'vega'
        };

        const errors = validateCompilation(options);

        expect(errors).toEqual(['Invalid JSON: Unexpected token']);
    });

    it('should not call buildEmbedOptions', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega',
            embedOptions: { padding: 10 },
            logLevel: 3
        };

        validateCompilation(options);

        expect(buildEmbedOptions).not.toHaveBeenCalled();
    });

    it('should pass all relevant options to parseSpec', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const mockSchemaValidator = vi.fn().mockReturnValue({
            valid: true,
            warnings: []
        });

        const options: CompileSpecOptions = {
            spec: '{}',
            config: '{"background": "white"}',
            provider: 'vegaLite',
            schemaValidator: mockSchemaValidator,
            containerDimensions: { width: 800, height: 600 },
            embedOptions: { padding: 10 },
            logLevel: 2
        };

        validateCompilation(options);

        expect(parseSpec).toHaveBeenCalledWith({
            spec: '{}',
            config: '{"background": "white"}',
            provider: 'vegaLite',
            schemaValidator: mockSchemaValidator,
            containerDimensions: { width: 800, height: 600 }
        });
    });

    it('should handle multiple validation errors', () => {
        const mockParsedSpec = {
            status: 'error' as const,
            spec: null,
            config: null,
            errors: [
                'Error 1: Invalid schema',
                'Error 2: Missing marks',
                'Error 3: Invalid signal reference'
            ],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{complex invalid spec}',
            provider: 'vega'
        };

        const errors = validateCompilation(options);

        expect(errors).toHaveLength(3);
        expect(errors).toEqual([
            'Error 1: Invalid schema',
            'Error 2: Missing marks',
            'Error 3: Invalid signal reference'
        ]);
    });

    it('should ignore embedOptions and logLevel parameters', () => {
        const mockParsedSpec = {
            status: 'valid' as const,
            spec: {},
            config: {},
            errors: [],
            warnings: []
        };

        vi.mocked(parseSpec).mockReturnValue(mockParsedSpec);

        const options: CompileSpecOptions = {
            spec: '{}',
            provider: 'vega',
            embedOptions: { actions: true, renderer: 'canvas' as const },
            logLevel: 4
        };

        validateCompilation(options);

        // Verify that embedOptions and logLevel are stripped out
        expect(parseSpec).toHaveBeenCalledWith({
            spec: '{}',
            provider: 'vega'
        });
    });
});
