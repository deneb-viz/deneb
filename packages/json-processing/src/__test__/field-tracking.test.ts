import { describe, expect, it } from 'vitest';
import {
    TrackedDrilldownProperties,
    TrackedFields,
    UsermetaDatasetField
} from '@deneb-viz/core-dependencies';
import {
    areAllRemapDataRequirementsMet,
    getRemapEligibleFields,
    isMappingDialogRequired
} from '../field-tracking';

const TRACKED_FIELDS_NO_REMAP_PENDING: TrackedFields = {
    'Date.Date': {
        placeholder: '__0__',
        paths: [
            ['signals', 0, 'on', 0, 'update'],
            ['data', 1, 'transform', 0, 'expr'],
            ['data', 1, 'transform', 0, 'as'],
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'x', 'field'],
            ['scales', 0, 'domain', 'field'],
            ['axes', 2, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    },
    'Financials.$ Sales': {
        placeholder: '__1__',
        paths: [
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'y', 'field'],
            ['scales', 1, 'domain', 'field'],
            ['axes', 3, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        },
        templateMetadataOriginal: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        }
    }
};

const TRACKED_FIELDS_REMAP_PENDING: TrackedFields = {
    'Date.Date': {
        placeholder: '__0__',
        paths: [
            ['signals', 0, 'on', 0, 'update'],
            ['data', 1, 'transform', 0, 'expr'],
            ['data', 1, 'transform', 0, 'as'],
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'x', 'field'],
            ['scales', 0, 'domain', 'field'],
            ['axes', 2, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: true,
        templateMetadata: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    },
    'Financials.$ Sales': {
        placeholder: '__1__',
        paths: [
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'y', 'field'],
            ['scales', 1, 'domain', 'field'],
            ['axes', 3, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        },
        templateMetadataOriginal: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        }
    },
    'Date.Year Month': {
        placeholder: '__2__',
        paths: [],
        isInDataset: true,
        isInSpecification: false,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Date.Year Month',
            name: 'Year Month',
            namePlaceholder: 'Year Month',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Year Month',
            name: 'Year Month',
            namePlaceholder: 'Year Month',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    }
};

describe('areAllRemapDataRequirementsMet', () => {
    it('should be true when all remap fields are assigned and drilldown properties are not required', () => {
        const options = {
            remapFields: [
                {
                    key: 'Financials.$ Profit',
                    name: '$ Profit',
                    namePlaceholder: '$ Profit',
                    description: '',
                    kind: 'measure',
                    type: 'numeric',
                    suppliedObjectKey: 'Financials.$ Sales',
                    suppliedObjectName: '$ Sales'
                },
                {
                    key: 'Date.Year Month',
                    name: 'Year Month',
                    namePlaceholder: 'Year Month',
                    description: '',
                    kind: 'column',
                    type: 'dateTime',
                    suppliedObjectKey: 'Date.Year',
                    suppliedObjectName: 'Date'
                }
            ] as UsermetaDatasetField[],
            drilldownProperties: {
                isCurrent: false,
                isMappingRequired: false
            }
        };
        const result = areAllRemapDataRequirementsMet(options);
        expect(result.remapAllFieldsAssigned).toBe(true);
        expect(result.remapDrilldownAssigned).toBe(true);
        expect(result.remapAllDependenciesAssigned).toBe(true);
    });
    it('should return false when not all remap fields are assigned and drilldown properties are not required', () => {
        const options = {
            remapFields: [
                {
                    key: 'Financials.$ Profit',
                    name: '$ Profit',
                    namePlaceholder: '$ Profit',
                    description: '',
                    kind: 'measure',
                    type: 'numeric'
                },
                {
                    key: 'Date.Year Month',
                    name: 'Year Month',
                    namePlaceholder: 'Year Month',
                    description: '',
                    kind: 'column',
                    type: 'dateTime',
                    suppliedObjectKey: 'Date.Year',
                    suppliedObjectName: 'Date'
                }
            ] as UsermetaDatasetField[],
            drilldownProperties: {
                isCurrent: false,
                isMappingRequired: false
            }
        };
        const result = areAllRemapDataRequirementsMet(options);
        expect(result.remapAllFieldsAssigned).toBe(false);
        expect(result.remapDrilldownAssigned).toBe(true);
        expect(result.remapAllDependenciesAssigned).toBe(false);
    });
    it('should return false when all remap fields are assigned and drilldown properties are required but not assigned', () => {
        const options = {
            remapFields: [
                {
                    key: 'Financials.$ Profit',
                    name: '$ Profit',
                    namePlaceholder: '$ Profit',
                    description: '',
                    kind: 'measure',
                    type: 'numeric',
                    suppliedObjectKey: 'Financials.$ Sales',
                    suppliedObjectName: '$ Sales'
                },
                {
                    key: 'Date.Year Month',
                    name: 'Year Month',
                    namePlaceholder: 'Year Month',
                    description: '',
                    kind: 'column',
                    type: 'dateTime',
                    suppliedObjectKey: 'Date.Year',
                    suppliedObjectName: 'Date'
                }
            ] as UsermetaDatasetField[],
            drilldownProperties: {
                isCurrent: false,
                isMappingRequired: true
            }
        };
        const result = areAllRemapDataRequirementsMet(options);
        expect(result.remapAllFieldsAssigned).toBe(true);
        expect(result.remapDrilldownAssigned).toBe(false);
        expect(result.remapAllDependenciesAssigned).toBe(false);
    });
    it('should return the true when not all remap fields are assigned and drilldown properties are required and assigned', () => {
        const options = {
            remapFields: [
                {
                    key: 'Financials.$ Profit',
                    name: '$ Profit',
                    namePlaceholder: '$ Profit',
                    description: '',
                    kind: 'measure',
                    type: 'numeric',
                    suppliedObjectKey: 'Financials.$ Sales',
                    suppliedObjectName: '$ Sales'
                },
                {
                    key: 'Date.Year Month',
                    name: 'Year Month',
                    namePlaceholder: 'Year Month',
                    description: '',
                    kind: 'column',
                    type: 'dateTime',
                    suppliedObjectKey: 'Date.Year',
                    suppliedObjectName: 'Date'
                }
            ] as UsermetaDatasetField[],
            drilldownProperties: {
                isCurrent: true,
                isMappingRequired: false
            }
        };
        const result = areAllRemapDataRequirementsMet(options);
        expect(result.remapAllFieldsAssigned).toBe(true);
        expect(result.remapDrilldownAssigned).toBe(true);
        expect(result.remapAllDependenciesAssigned).toBe(true);
    });
});

describe('getRemapEligibleFields', () => {
    it('should return an array of remap eligible fields sorted by name', () => {
        const expectedFields: UsermetaDatasetField[] = [
            {
                key: 'Financials.$ Sales',
                name: '$ Sales',
                namePlaceholder: '$ Sales',
                description: '',
                kind: 'measure',
                type: 'numeric',
                suppliedObjectKey: 'Financials.$ Sales',
                suppliedObjectName: '$ Sales'
            },
            {
                key: 'Date.Date',
                name: 'Date',
                namePlaceholder: 'Date',
                description: '',
                kind: 'column',
                type: 'dateTime',
                suppliedObjectKey: 'Date.Date',
                suppliedObjectName: 'Date'
            }
        ];
        const result = getRemapEligibleFields(TRACKED_FIELDS_NO_REMAP_PENDING);
        expect(result).toEqual(expectedFields);
    });
});

describe('isMappingDialogRequired', () => {
    it('should return false if none of the tracked fields require mapping', () => {
        const options = {
            trackedFields: TRACKED_FIELDS_NO_REMAP_PENDING,
            drilldownProperties: {
                isMappingRequired: false
            } as TrackedDrilldownProperties
        };
        const result = isMappingDialogRequired(options);
        expect(result).toBe(false);
    });
    it('should return true if there are tracked fields with mapping required', () => {
        const options = {
            trackedFields: TRACKED_FIELDS_REMAP_PENDING,
            drilldownProperties: {
                isMappingRequired: false
            } as TrackedDrilldownProperties
        };
        const result = isMappingDialogRequired(options);
        expect(result).toBe(true);
    });
    it('should return true if drilldown properties require mapping', () => {
        const options = {
            trackedFields: TRACKED_FIELDS_NO_REMAP_PENDING,
            drilldownProperties: {
                isMappingRequired: true
            } as TrackedDrilldownProperties
        };
        const result = isMappingDialogRequired(options);
        expect(result).toBe(true);
    });
});
