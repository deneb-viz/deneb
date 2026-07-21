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
            datasets: { dataset: [] }
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

    it('should accept a template with multiple dataset keys (forward compatibility)', () => {
        const validate = getProviderValidator();
        const multiDatasetTemplate = {
            deneb: {
                build: '1.0.0',
                metaVersion: 2,
                provider: 'vegaLite',
                providerVersion: '5.0.0'
            },
            information: {
                name: 'Multi-dataset Template',
                uuid: '12345678-1234-4234-a234-123456789012',
                generated: '2024-01-01T00:00:00.000Z',
                author: 'Test Author'
            },
            datasets: {
                dataset: [
                    {
                        key: '__dataset.0__',
                        name: 'Sales',
                        type: 'numeric'
                    }
                ],
                mapLayer: [
                    {
                        key: '__mapLayer.0__',
                        name: 'Region',
                        type: 'text'
                    }
                ]
            }
        };
        const result = validate(multiDatasetTemplate);
        expect(result).toBe(true);
        expect(validate.errors).toBeNull();
    });

    it('should reject a template using the legacy "dataset" property (additionalProperties: false)', () => {
        const validate = getProviderValidator();
        const legacyTemplate = {
            deneb: {
                build: '1.0.0',
                metaVersion: 1,
                provider: 'vegaLite',
                providerVersion: '5.0.0'
            },
            information: {
                name: 'Legacy Template',
                uuid: '12345678-1234-4234-a234-123456789012',
                generated: '2024-01-01T00:00:00.000Z',
                author: 'Test Author'
            },
            dataset: [{ key: '__0__', name: 'Sales', type: 'numeric' }]
        };
        const result = validate(legacyTemplate);
        expect(result).toBe(false);
        expect(validate.errors).not.toBeNull();
    });

    it('should reject a template containing both legacy dataset and new datasets', () => {
        const validate = getProviderValidator();
        const dualTemplate = {
            deneb: {
                build: '1.0.0',
                metaVersion: 2,
                provider: 'vegaLite',
                providerVersion: '5.0.0'
            },
            information: {
                name: 'Both Template',
                uuid: '12345678-1234-4234-a234-123456789012',
                generated: '2024-01-01T00:00:00.000Z',
                author: 'Test Author'
            },
            dataset: [{ key: '__0__', name: 'Sales', type: 'numeric' }],
            datasets: {
                dataset: [
                    { key: '__dataset.0__', name: 'Sales', type: 'numeric' }
                ]
            }
        };
        const result = validate(dualTemplate);
        expect(result).toBe(false);
        expect(validate.errors).not.toBeNull();
    });

    it('should reject placeholder keys not matching the dataset-scoped pattern', () => {
        const validate = getProviderValidator();
        const oldKeyTemplate = {
            deneb: {
                build: '1.0.0',
                metaVersion: 2,
                provider: 'vegaLite',
                providerVersion: '5.0.0'
            },
            information: {
                name: 'Old Key Template',
                uuid: '12345678-1234-4234-a234-123456789012',
                generated: '2024-01-01T00:00:00.000Z',
                author: 'Test Author'
            },
            datasets: {
                dataset: [{ key: '__0__', name: 'Sales', type: 'numeric' }]
            }
        };
        const result = validate(oldKeyTemplate);
        expect(result).toBe(false);
        expect(validate.errors).not.toBeNull();
    });
});
