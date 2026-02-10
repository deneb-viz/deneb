import { describe, expect, it } from 'vitest';
import { getResolvedValueDescriptor } from '../fields';

describe('getResolvedValueDescriptor', () => {
    it('should return "bool" when type is a boolean', () => {
        const type: powerbi.ValueTypeDescriptor = { bool: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('bool');
    });

    it('should return "text" when type is a text', () => {
        const type: powerbi.ValueTypeDescriptor = { text: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('text');
    });

    it('should return "numeric" when type is numeric', () => {
        const type: powerbi.ValueTypeDescriptor = { numeric: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('numeric');
    });

    it('should return "dateTime" when type is a dateTime', () => {
        const type: powerbi.ValueTypeDescriptor = { dateTime: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('dateTime');
    });

    it('should return "other" when type is not recognized', () => {
        const type: powerbi.ValueTypeDescriptor = {};
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('other');
    });
});
