import { describe, expect, it } from 'vitest';
import { getProviderValidator } from '../validation';

describe('getProviderValidator', () => {
    it('should return a validate function', () => {
        const validate = getProviderValidator();
        expect(typeof validate).toBe('function');
    });

    it('should validate a valid denebUserMeta template', () => {
        const validate = getProviderValidator();
        const validTemplate = {
            deneb: {
                build: '1.0.0',
                metaVersion: 1,
                provider: 'vegaLite',
                providerVersion: '5.0.0'
            },
            information: {
                name: 'Test Template',
                uuid: '12345678-1234-4234-a234-123456789012',
                generated: '2024-01-01T00:00:00.000Z',
                author: 'Test Author'
            },
            dataset: []
        };
        const result = validate(validTemplate);
        expect(result).toBe(true);
        expect(validate.errors).toBeNull();
    });

    it('should reject an invalid denebUserMeta template missing required fields', () => {
        const validate = getProviderValidator();
        const invalidTemplate = {
            deneb: {
                build: '1.0.0'
            }
        };
        const result = validate(invalidTemplate);
        expect(result).toBe(false);
        expect(validate.errors).not.toBeNull();
        expect(validate.errors!.length).toBeGreaterThan(0);
    });

    it('should return the same schema across multiple calls', () => {
        const validate1 = getProviderValidator();
        const validate2 = getProviderValidator();
        expect(validate1.schema).toEqual(validate2.schema);
    });
});
