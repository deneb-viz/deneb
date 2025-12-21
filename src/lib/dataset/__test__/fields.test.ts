import { describe, expect, it } from 'vitest';
import {
    getResolvedValueDescriptor,
    getResolvedVisualMetadataToDatasetField
} from '../fields';

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

describe('getResolvedVisualMetadataToDatasetField', () => {
    const metadata: powerbi.DataViewMetadataColumn = {
        queryName: 'queryName',
        displayName: 'displayName',
        isMeasure: true,
        type: { bool: true }
    };
    const encodedName = 'encodedName';

    it('should return the expected UsermetaDatasetField object', () => {
        const result = getResolvedVisualMetadataToDatasetField(
            metadata,
            encodedName
        );
        expect(result).toEqual({
            key: metadata.queryName,
            name: encodedName,
            namePlaceholder: encodedName,
            description: '',
            kind: 'measure',
            type: 'bool'
        });
    });

    it('should return "column" as the kind if metadata.isMeasure is false', () => {
        const metadataWithoutMeasure: powerbi.DataViewMetadataColumn = {
            queryName: 'queryName',
            displayName: 'displayName',
            isMeasure: false,
            type: { bool: true }
        };
        const result = getResolvedVisualMetadataToDatasetField(
            metadataWithoutMeasure,
            encodedName
        );
        expect(result.kind).toEqual('column');
    });

    it('should return the resolved value descriptor type', () => {
        const result = getResolvedVisualMetadataToDatasetField(
            metadata,
            encodedName
        );
        expect(result.type).toEqual('bool');
    });
});
