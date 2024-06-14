import { SpecProvider } from '@deneb-viz/core-dependencies';
import {
    getFriendlyValidationErrors,
    getProviderSchema,
    getProviderValidator,
    getSchemaWithMarkdownProps
} from '../validation';
import * as vegaSchema from 'vega/build/vega-schema.json';
import { ErrorObject } from 'ajv';

describe('getProviderSchema', () => {
    it('should return an empty object when isConfig is true', () => {
        const options = {
            provider: 'vega' as SpecProvider,
            version: 'current',
            isConfig: true
        };
        const result = getProviderSchema(options);
        expect(result).toEqual({});
    });
    it('should return the schema for the specified provider and version', () => {
        const options = {
            provider: 'vega' as SpecProvider,
            version: 'current',
            isConfig: false
        };
        const result = getProviderSchema(options);
        const expected = getSchemaWithMarkdownProps(vegaSchema);
        expect(result).toEqual(expected);
    });
});

describe('getProviderValidator', () => {
    it('should return a validate function', () => {
        const options = {
            provider: 'vega' as SpecProvider,
            version: 'current',
            isConfig: false
        };
        const validate = getProviderValidator(options);
        expect(typeof validate).toBe('function');
    });

    it('should return a validate function with the correct schema', () => {
        const options = {
            provider: 'vega' as SpecProvider,
            version: 'current',
            isConfig: false
        };
        const validate = getProviderValidator(options);
        expect(validate.schema).toEqual(getProviderSchema(options));
    });
    it('should return a validate function if mandatory properties supplied', () => {
        const options = {
            provider: 'vega' as SpecProvider
        };
        const validate = getProviderValidator(options);
        expect(validate.schema).toEqual(getProviderSchema(options));
    });
});

describe('getFriendlyValidationErrors', () => {
    it('should return an array of friendly validation errors', () => {
        const errors: ErrorObject[] = [
            {
                instancePath: '/path/to/property',
                message: 'Invalid value',
                schemaPath: '/path/to/schema',
                keyword: 'type',
                params: {}
            },
            {
                instancePath: '/',
                message: 'Missing required property',
                schemaPath: '/path/to/schema',
                keyword: 'required',
                params: {}
            }
        ];
        const result = getFriendlyValidationErrors(errors);
        expect(result).toEqual([
            '/path/to/property Invalid value of /path/to/schema',
            '/ Missing required property of /path/to/schema'
        ]);
    });
    it('should return an empty array when there are no errors', () => {
        const errors: ErrorObject[] = [];
        const result = getFriendlyValidationErrors(errors);
        expect(result).toEqual([]);
    });
});
