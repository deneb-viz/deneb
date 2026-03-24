import { describe, expect, it } from 'vitest';
import { stripConfigFromSpec, stripSchemaFromSpec } from '../spec-utils';

describe('stripSchemaFromSpec', () => {
    it('should remove the $schema property', () => {
        const spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const result = stripSchemaFromSpec(spec);
        expect(result).toEqual({ marks: [] });
        expect(result).not.toHaveProperty('$schema');
    });

    it('should preserve all other properties', () => {
        const spec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: [1, 2] },
            mark: 'bar',
            encoding: { x: { field: 'a' } }
        };
        const result = stripSchemaFromSpec(spec);
        expect(result).toEqual({
            data: { values: [1, 2] },
            mark: 'bar',
            encoding: { x: { field: 'a' } }
        });
    });

    it('should return the object unchanged if $schema is not present', () => {
        const spec = { marks: [], signals: [] };
        const result = stripSchemaFromSpec(spec);
        expect(result).toEqual({ marks: [], signals: [] });
    });

    it('should not mutate the input object', () => {
        const spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const original = { ...spec };
        stripSchemaFromSpec(spec);
        expect(spec).toEqual(original);
    });
});

describe('stripConfigFromSpec', () => {
    it('should remove the config property', () => {
        const spec = {
            marks: [],
            config: { background: 'white' }
        };
        const result = stripConfigFromSpec(spec);
        expect(result).toEqual({ marks: [] });
        expect(result).not.toHaveProperty('config');
    });

    it('should return the object unchanged if config is not present', () => {
        const spec = { marks: [], signals: [] };
        const result = stripConfigFromSpec(spec);
        expect(result).toEqual({ marks: [], signals: [] });
    });

    it('should not mutate the input object', () => {
        const spec = {
            marks: [],
            config: { background: 'white' }
        };
        const original = { ...spec };
        stripConfigFromSpec(spec);
        expect(spec).toEqual(original);
    });
});
