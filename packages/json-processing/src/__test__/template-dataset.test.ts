import powerbi from 'powerbi-visuals-api';
import { describe, expect, it } from 'vitest';
import {
    PROPERTIES_DEFAULTS,
    SpecProvider,
    TEMPLATE_USERMETA_VERSION,
    UsermetaDatasetField,
    UsermetaTemplate,
    getBase64ImagePngBlank
} from '@deneb-viz/core-dependencies';
import {
    areAllCreateDataRequirementsMet,
    areAllTemplateFieldsAssigned,
    getTemplateDatasetFieldType
} from '../template-dataset';

const INCOMPLETE_FIELD: UsermetaDatasetField[] = [
    {
        name: 'Field 0',
        key: '__0__',
        kind: 'column',
        type: 'text'
    }
];
const COMPLETE_FIELD: UsermetaDatasetField[] = [
    {
        name: 'Field 1',
        key: '__0__',
        kind: 'measure',
        type: 'numeric',
        suppliedObjectKey: 'Field1'
    }
];
const PARTIALLY_COMPLETE_FIELDS: UsermetaDatasetField[] = [
    ...INCOMPLETE_FIELD,
    ...COMPLETE_FIELD
];

const MOCK_BUILD_VERSION = '1.0.0';
const MOCK_DATE = '2022-01-01T00:00:00.000Z';
const MOCK_PROVIDER = 'vegaLite' as SpecProvider;
const MOCK_PROVIDER_VERSION = '5.0.0';
const MOCK_UUID = 'mock-uuid';
const MOCK_BLANK_IMAGE_BASE64 = getBase64ImagePngBlank();

const MOCK_TEMPLATE_METADATA_BASE: UsermetaTemplate = {
    information: {
        uuid: MOCK_UUID,
        generated: MOCK_DATE,
        previewImageBase64PNG: MOCK_BLANK_IMAGE_BASE64,
        name: '',
        description: '',
        author: ''
    },
    deneb: {
        build: MOCK_BUILD_VERSION,
        metaVersion: TEMPLATE_USERMETA_VERSION,
        provider: MOCK_PROVIDER,
        providerVersion: MOCK_PROVIDER_VERSION
    },
    interactivity: {
        tooltip: PROPERTIES_DEFAULTS.vega.enableTooltips,
        contextMenu: PROPERTIES_DEFAULTS.vega.enableContextMenu,
        selection: PROPERTIES_DEFAULTS.vega.enableSelection,
        selectionMode: PROPERTIES_DEFAULTS.vega.selectionMode,
        dataPointLimit: PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints,
        highlight: PROPERTIES_DEFAULTS.vega.enableHighlight
    },
    dataset: [],
    config: '{}'
};

describe('areAllTemplateFieldsAssigned', () => {
    it('should return true if no fields are supplied', () => {
        expect(areAllTemplateFieldsAssigned([])).toBe(true);
    });
    it('should return true if all fields are supplied', () => {
        expect(areAllTemplateFieldsAssigned(COMPLETE_FIELD)).toBe(true);
    });
    it('should return false if some fields are not supplied', () => {
        expect(areAllTemplateFieldsAssigned(INCOMPLETE_FIELD)).toBe(false);
    });
    it('should return false if some fields are not supplied', () => {
        expect(areAllTemplateFieldsAssigned(PARTIALLY_COMPLETE_FIELDS)).toBe(
            false
        );
    });
});

describe('areAllCreateDataRequirementsMet', () => {
    it('should return true if all dependencies are assigned', () => {
        const metadata: UsermetaTemplate = {
            ...MOCK_TEMPLATE_METADATA_BASE,
            dataset: COMPLETE_FIELD
        };
        const result = areAllCreateDataRequirementsMet(metadata);
        expect(result.metadataAllDependenciesAssigned).toBe(true);
    });
    it('should return false if not all fields are assigned', () => {
        const metadata: UsermetaTemplate = {
            ...MOCK_TEMPLATE_METADATA_BASE,
            dataset: INCOMPLETE_FIELD
        };
        const result = areAllCreateDataRequirementsMet(metadata);
        expect(result.metadataAllDependenciesAssigned).toBe(false);
    });
});

describe('getTemplateDatasetFieldType', () => {
    it('should return "bool" for a boolean type', () => {
        const type: powerbi.ValueTypeDescriptor = { bool: true };
        expect(getTemplateDatasetFieldType(type)).toBe('bool');
    });
    it('should return "text" for a text type', () => {
        const type: powerbi.ValueTypeDescriptor = { text: true };
        expect(getTemplateDatasetFieldType(type)).toBe('text');
    });
    it('should return "numeric" for a numeric type', () => {
        const type: powerbi.ValueTypeDescriptor = { numeric: true };
        expect(getTemplateDatasetFieldType(type)).toBe('numeric');
    });
    it('should return "dateTime" for a dateTime type', () => {
        const type: powerbi.ValueTypeDescriptor = { dateTime: true };
        expect(getTemplateDatasetFieldType(type)).toBe('dateTime');
    });
    it('should return "other" for a type not in our supported mapping', () => {
        const type: powerbi.ValueTypeDescriptor = { none: true };
        expect(getTemplateDatasetFieldType(type)).toBe('other');
    });
    it('should return "other" for an unknown type', () => {
        const type: powerbi.ValueTypeDescriptor = {};
        expect(getTemplateDatasetFieldType(type)).toBe('other');
    });
});
