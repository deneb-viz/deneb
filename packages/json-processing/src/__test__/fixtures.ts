import { type TrackedFields } from '../lib/field-tracking';

/**
 * Shared tracked-field fixtures consumed by more than one suite (currently
 * `field-tracking.test.ts` and the worker `tokenizer.test.ts`). They are kept
 * here so the suites provably consume the same data and cannot drift apart.
 */

export const TRACKED_FIELDS_NO_REMAP_PENDING: TrackedFields = {
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

export const TRACKED_FIELDS_REMAP_PENDING: TrackedFields = {
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
