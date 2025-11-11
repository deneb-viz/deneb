import { getJsoncStringAsObject } from '../processing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    PROVIDER_RESOURCES,
    getExportTemplate,
    getNewCreateFromTemplateSliceProperties,
    getNewTemplateMetadata,
    getPublishableUsermeta,
    getResolvedValueDescriptor,
    getResolvedVisualMetadataToDatasetField,
    getTemplateMetadata,
    getTemplateProvider,
    getTemplateReplacedForDataset,
    getTemplateResolvedForLegacyConfig,
    getTemplateResolvedForLegacyVersions,
    getTemplateResolvedForPlaceholderAssignment,
    getUpdatedExportMetadata,
    getValidatedTemplate
} from '../template-usermeta';
import {
    IDenebTemplateAllocationComponents,
    PROPERTIES_DEFAULTS,
    SelectionMode,
    SpecProvider,
    TrackedFields,
    UsermetaDatasetField,
    UsermetaTemplate,
    getBase64ImagePngBlank
} from '@deneb-viz/core-dependencies';
import { TEMPLATE_USERMETA_VERSION } from '@deneb-viz/template-usermeta';

const MOCK_BUILD_VERSION = '1.0.0';
const MOCK_DATE = '2022-01-01T00:00:00.000Z';
const MOCK_PROVIDER = 'vegaLite' as SpecProvider;
const MOCK_PROVIDER_VERSION = '5.0.0';
const MOCK_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MOCK_BLANK_IMAGE_BASE64 = getBase64ImagePngBlank();

const MOCK_TEMPLATE_METADATA_BASE = `{
    /* This is a JSON comment */
    "usermeta": {
        "information": {
            "uuid": "${MOCK_UUID}",
            "generated": "${MOCK_DATE}",
            "previewImageBase64PNG": "${MOCK_BLANK_IMAGE_BASE64}",
            "name": "",
            "description": "",
            "author": ""
        },
        "deneb": {
            "build": "${MOCK_BUILD_VERSION}",
            "metaVersion": "${TEMPLATE_USERMETA_VERSION}",
            "provider": "${MOCK_PROVIDER}",
            "providerVersion": "${MOCK_PROVIDER_VERSION}"
        },
        "interactivity": {
            "tooltip": ${PROPERTIES_DEFAULTS.vega.enableTooltips},
            "contextMenu": ${PROPERTIES_DEFAULTS.vega.enableContextMenu},
            "selection": ${PROPERTIES_DEFAULTS.vega.enableSelection},
            "selectionMode": "${PROPERTIES_DEFAULTS.vega.selectionMode}",
            "dataPointLimit": ${PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints},
            "highlight": ${PROPERTIES_DEFAULTS.vega.enableHighlight}
        },
        "dataset": [],
        "config": "{}"
    }
}`;

const MOCK_TEMPLATE_METADATA_NO_PROVIDER_VERSION = `{
    /* This is a JSON comment */
    "usermeta": {
        "information": {
            "uuid": "${MOCK_UUID}",
            "generated": "${MOCK_DATE}",
            "previewImageBase64PNG": "${MOCK_BLANK_IMAGE_BASE64}",
            "name": "",
            "description": "",
            "author": ""
        },
        "deneb": {
            "build": "${MOCK_BUILD_VERSION}",
            "metaVersion": "${TEMPLATE_USERMETA_VERSION}",
            "provider": "${MOCK_PROVIDER}"
        },
        "interactivity": {
            "tooltip": ${PROPERTIES_DEFAULTS.vega.enableTooltips},
            "contextMenu": ${PROPERTIES_DEFAULTS.vega.enableContextMenu},
            "selection": ${PROPERTIES_DEFAULTS.vega.enableSelection},
            "selectionMode": "${PROPERTIES_DEFAULTS.vega.selectionMode}",
            "dataPointLimit": ${PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints},
            "highlight": ${PROPERTIES_DEFAULTS.vega.enableHighlight}
        },
        "dataset": [],
        "config": "{}"
    }
}`;

const EXPECTED_METADATA_BASE = {
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

const TRACKED_FIELDS: TrackedFields = {
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

const TEMPLATE_DATASET: UsermetaDatasetField[] = [
    {
        key: 'Date.Date',
        name: 'Date',
        namePlaceholder: 'Date',
        description: '',
        kind: 'column',
        type: 'dateTime'
    },
    {
        key: 'Financials.$ Sales',
        name: '$ Sales',
        namePlaceholder: '$ Sales',
        description: '',
        kind: 'measure',
        type: 'numeric'
    }
];

describe('getExportTemplate', () => {
    const MOCK_INFORMATION_TRANSLATION_PLACEHOLDERS = {
        name: 'name-placeholder',
        description: 'description-placeholder',
        author: 'author-placeholder'
    };
    const MOCK_METADATA: UsermetaTemplate = {
        ...EXPECTED_METADATA_BASE,
        dataset: TEMPLATE_DATASET
    };
    const MOCK_TOKENIZED_SPEC =
        '{"config": {}, "data": {"values": [] }, "mark": "bar"}';

    it('should return the expected JSONC formatted string with updated usermeta and schema', () => {
        const expectedJsonc = `{
  "$schema": "${PROVIDER_RESOURCES[MOCK_METADATA.deneb.provider].schemaUrl}",
  "usermeta": {
    "information": {
      "uuid": "${MOCK_UUID}",
      "generated": "${MOCK_DATE}",
      "previewImageBase64PNG": "${MOCK_BLANK_IMAGE_BASE64}",
      "name": "name-placeholder",
      "description": "description-placeholder",
      "author": "author-placeholder"
    },
    "deneb": {
      "build": "${MOCK_BUILD_VERSION}",
      "metaVersion": ${TEMPLATE_USERMETA_VERSION},
      "provider": "${MOCK_PROVIDER}",
      "providerVersion": "${MOCK_PROVIDER_VERSION}"
    },
    "interactivity": {
      "tooltip": ${PROPERTIES_DEFAULTS.vega.enableTooltips},
      "contextMenu": ${PROPERTIES_DEFAULTS.vega.enableContextMenu},
      "selection": ${PROPERTIES_DEFAULTS.vega.enableSelection},
      "selectionMode": "${PROPERTIES_DEFAULTS.vega.selectionMode}",
      "dataPointLimit": ${PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints},
      "highlight": ${PROPERTIES_DEFAULTS.vega.enableHighlight}
    },
    "dataset": [
      {
        "key": "__0__",
        "name": "Date",
        "description": "",
        "kind": "column",
        "type": "dateTime"
      },
      {
        "key": "__1__",
        "name": "$ Sales",
        "description": "",
        "kind": "measure",
        "type": "numeric"
      }
    ],
    "config": "{}"
  },
  "config": {},
  "data": {
    "values": []
  },
  "mark": "bar"
}`;

        const result = getExportTemplate({
            informationTranslationPlaceholders:
                MOCK_INFORMATION_TRANSLATION_PLACEHOLDERS,
            metadata: MOCK_METADATA,
            tokenizedSpec: MOCK_TOKENIZED_SPEC,
            trackedFields: TRACKED_FIELDS
        });

        expect(result).toEqual(expectedJsonc);
    });
});

describe('getNewCreateFromTemplateSliceProperties', () => {
    it('should return the expected partial create slice properties object', () => {
        const result = getNewCreateFromTemplateSliceProperties();
        expect(result).toEqual({
            candidates: null,
            importFile: null,
            importState: 'None',
            metadata: null,
            metadataAllDependenciesAssigned: false,
            metadataAllFieldsAssigned: false,
            metadataDrilldownAssigned: false,
            mode: 'import'
        });
    });
});

describe('getNewTemplateMetadata', () => {
    const MOCK_OPTIONS = {
        buildVersion: MOCK_BUILD_VERSION,
        provider: MOCK_PROVIDER,
        providerVersion: MOCK_PROVIDER_VERSION
    };
    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_DATE);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should return the expected template metadata object', () => {
        const result = getNewTemplateMetadata(MOCK_OPTIONS);
        if (result.information) {
            result.information.uuid = MOCK_UUID;
        }
        expect(result).toEqual(EXPECTED_METADATA_BASE);
    });
    it('should call Date.prototype.toISOString to get the current date and time', () => {
        getNewTemplateMetadata(MOCK_OPTIONS);
        expect(Date.prototype.toISOString).toHaveBeenCalled();
    });
});

describe('getPublishableUsermeta ', () => {
    const MOCK_USERMETA: UsermetaTemplate = {
        ...EXPECTED_METADATA_BASE,
        dataset: TEMPLATE_DATASET
    };
    const MOCK_OPTIONS = {
        informationTranslationPlaceholders: {
            name: 'name-placeholder',
            description: 'description-placeholder',
            author: 'author-placeholder'
        },
        trackedFields: TRACKED_FIELDS
    };

    it('should return the updated usermeta with placeholders and omitted namePlaceholder', () => {
        const expectedUsermeta: UsermetaTemplate = {
            ...EXPECTED_METADATA_BASE,
            information: {
                ...EXPECTED_METADATA_BASE.information,
                name: 'name-placeholder',
                description: 'description-placeholder',
                author: 'author-placeholder'
            },
            dataset: [
                {
                    key: '__0__',
                    name: 'Date',
                    description: '',
                    kind: 'column',
                    type: 'dateTime'
                },
                {
                    key: '__1__',
                    name: '$ Sales',
                    description: '',
                    kind: 'measure',
                    type: 'numeric'
                }
            ]
        };

        const result = getPublishableUsermeta(MOCK_USERMETA, MOCK_OPTIONS);
        expect(result).toEqual(expectedUsermeta);
    });

    it('should not modify the original usermeta object', () => {
        const result = getPublishableUsermeta(MOCK_USERMETA, MOCK_OPTIONS);
        expect(result).not.toBe(MOCK_USERMETA);
    });
});

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

describe('getTemplateMetadata', () => {
    it('should return the expected template metadata object', () => {
        const expectedMetadata = getJsoncStringAsObject(
            MOCK_TEMPLATE_METADATA_BASE
        ).usermeta;
        const result = getTemplateMetadata(MOCK_TEMPLATE_METADATA_BASE);
        expect(result).toEqual(expectedMetadata);
    });
    it('should return an empty object if the template does not have usermeta property', () => {
        const templateWithoutUsermeta = `{
            "otherProperty": "value"
        }`;
        const result = getTemplateMetadata(templateWithoutUsermeta);
        expect(result).toEqual({});
    });
});

describe('getTemplateProvider', () => {
    const DEFAULT_PROVIDER = 'vega';
    it('should return the provider from the template metadata', () => {
        const result = getTemplateProvider(MOCK_TEMPLATE_METADATA_BASE);
        expect(result).toEqual(MOCK_PROVIDER);
    });
    it('should return the default provider if the template metadata is missing', () => {
        const template = '{}';
        const result = getTemplateProvider(template);
        expect(result).toEqual(DEFAULT_PROVIDER);
    });
    it('should return the default provider if the template metadata does not have the provider property', () => {
        const template = `{
            "usermeta": {
                "deneb": {}
            }
        }`;
        const result = getTemplateProvider(template);
        expect(result).toEqual(DEFAULT_PROVIDER);
    });
});

describe('getTemplateReplacedForDataset', () => {
    const spec = 'This is a sample spec with __0__ and __1__ placeholders.';
    const dataset: UsermetaDatasetField[] = [
        {
            key: '__0__',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime',
            suppliedObjectKey: 'Date.Date',
            suppliedObjectName: 'Date'
        },
        {
            key: '__1__',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric',
            suppliedObjectKey: 'Financials.$ Sales',
            suppliedObjectName: '$ Sales'
        }
    ];
    it('should replace the placeholders in the spec with the corresponding dataset values', () => {
        const expectedSpec =
            'This is a sample spec with Date and $ Sales placeholders.';
        const result = getTemplateReplacedForDataset(spec, dataset);
        expect(result).toEqual(expectedSpec);
    });
    it('should replace multiple occurrences of the same placeholder in the spec', () => {
        const specWithDuplicatePlaceholder =
            'This is a sample spec with __0__ and __0__ placeholders.';
        const expectedSpec =
            'This is a sample spec with Date and Date placeholders.';
        const result = getTemplateReplacedForDataset(
            specWithDuplicatePlaceholder,
            dataset
        );
        expect(result).toEqual(expectedSpec);
    });
    it('should not modify the original spec if no placeholders are present', () => {
        const specWithoutPlaceholders =
            'This is a sample spec without any placeholders.';
        const result = getTemplateReplacedForDataset(
            specWithoutPlaceholders,
            dataset
        );
        expect(result).toEqual(specWithoutPlaceholders);
    });
    it('should return the original spec if the dataset is empty', () => {
        const emptyDataset: UsermetaDatasetField[] = [];
        const result = getTemplateReplacedForDataset(spec, emptyDataset);
        expect(result).toEqual(spec);
    });
});

describe('getTemplateResolvedForLegacyConfig', () => {
    const templateLegacy = `{ "usermeta": { }, "config": { "foo": "bar" } }`;
    const templatePostConfig = `{ "usermeta": { "config": { "foo": "bar" } } }`;
    const tabSize = 2;
    it('should return the template with resolved legacy config in the usermeta object', () => {
        const expectedTemplate =
            '{ "usermeta": {"config": "{\\n  \\"foo\\": \\"bar\\"\\n}" } }';
        const result = getTemplateResolvedForLegacyConfig(
            templateLegacy,
            tabSize
        );
        expect(result).toEqual(expectedTemplate);
    });
    it('should return the template as is if config is already present in usermeta', () => {
        const expectedTemplate = `{ "usermeta": { "config": { "foo": "bar" } } }`;
        const result = getTemplateResolvedForLegacyConfig(
            templatePostConfig,
            tabSize
        );
        expect(result).toEqual(expectedTemplate);
    });
    it('should return the template as is if config is not present', () => {
        const templateWithoutConfig = `{ "usermeta": {} }`;
        const expectedTemplate = '{ "usermeta": {"config": "{}"} }';
        const result = getTemplateResolvedForLegacyConfig(
            templateWithoutConfig,
            tabSize
        );
        expect(result).toEqual(expectedTemplate);
    });
});

describe('getTemplateResolvedForLegacyVersions', () => {
    it('should return the correct legacy Vega version if providerVersion is missing', () => {
        const result = getJsoncStringAsObject(
            getTemplateResolvedForLegacyVersions(
                'vega',
                MOCK_TEMPLATE_METADATA_NO_PROVIDER_VERSION
            )
        );
        const expected = PROVIDER_RESOURCES.vega.legacyVersion;
        expect(result.usermeta.deneb.providerVersion).toEqual(expected);
    });
    it('should return the correct legacy Vega-Lite version if providerVersion is missing', () => {
        const result = getJsoncStringAsObject(
            getTemplateResolvedForLegacyVersions(
                'vegaLite',
                MOCK_TEMPLATE_METADATA_NO_PROVIDER_VERSION
            )
        );
        const expected = PROVIDER_RESOURCES.vegaLite.legacyVersion;
        expect(result.usermeta.deneb.providerVersion).toEqual(expected);
    });
    it('should return the provderVersion from the template if supplied', () => {
        const result = getJsoncStringAsObject(
            getTemplateResolvedForLegacyVersions(
                'vegaLite',
                MOCK_TEMPLATE_METADATA_BASE
            )
        );
        const expected = MOCK_PROVIDER_VERSION;
        expect(result.usermeta.deneb.providerVersion).toEqual(expected);
    });
});

describe('getTemplateResolvedForPlaceholderAssignment', () => {
    const template = `{
        "$schema": "https://example.com/schema.json",
        "usermeta": {
            "information": {
                "uuid": "mock-uuid",
                "generated": "2022-01-01T00:00:00.000Z",
                "previewImageBase64PNG": "mock-base64-image",
                "name": "Mock Template",
                "description": "This is a mock template",
                "author": "John Doe"
            },
            "deneb": {
                "build": "1.0.0",
                "metaVersion": "1.0.0",
                "provider": "mock-provider",
                "providerVersion": "2.0.0"
            },
            "interactivity": {
                "tooltip": true,
                "contextMenu": true,
                "selection": true,
                "selectionMode": "single",
                "dataPointLimit": 100,
                "highlight": true
            },
            "dataset": [
                {
                  "key": "__0__",
                  "name": "Date",
                  "description": "",
                  "kind": "column",
                  "type": "dateTime"
                },
                {
                  "key": "__1__",
                  "name": "$ Sales",
                  "description": "",
                  "kind": "measure",
                  "type": "numeric"
                }
            ],
            "config": "{\\n  // Config\\n  \\"font\\": \\"Arial\\"\\n}"
        },
        "data": {
            "values": []
        },
        "mark": {
            "type": "bar"
        },
        "encoding": {
            "x": {
                "field": "__0__",
                "type": "temporal"
            },
            "y": {
                "field": "__1__",
                "type": "quantitative"
            }
        }
    }`;
    const tabSize = 2;
    it('should allocate the spec and config objects if config is in the usermeta object', () => {
        const expectedComponents: IDenebTemplateAllocationComponents = {
            spec: `{
  "data": {
    "values": []
  },
  "mark": {
    "type": "bar"
  },
  "encoding": {
    "x": {
      "field": "__0__",
      "type": "temporal"
    },
    "y": {
      "field": "__1__",
      "type": "quantitative"
    }
  }
}`,
            config: `{\n  // Config\n  "font": "Arial"\n}`
        };
        const result = getTemplateResolvedForPlaceholderAssignment(
            template,
            tabSize
        );
        expect(result).toEqual(expectedComponents);
    });

    it('should return an empty config if template does not have config property', () => {
        const templateWithoutConfig = `{
            "$schema": "https://example.com/schema.json",
            "usermeta": {
                "information": {
                    "uuid": "mock-uuid",
                    "generated": "2022-01-01T00:00:00.000Z",
                    "previewImageBase64PNG": "mock-base64-image",
                    "name": "Mock Template",
                    "description": "This is a mock template",
                    "author": "John Doe"
                },
                "deneb": {
                    "build": "1.0.0",
                    "metaVersion": "1.0.0",
                    "provider": "mock-provider",
                    "providerVersion": "2.0.0"
                },
                "interactivity": {
                    "tooltip": true,
                    "contextMenu": true,
                    "selection": true,
                    "selectionMode": "single",
                    "dataPointLimit": 100,
                    "highlight": true
                },
                "dataset": [
                    {
                        "key": "__0__",
                        "name": "Date",
                        "description": "",
                        "kind": "column",
                        "type": "dateTime"
                    },
                    {
                        "key": "__1__",
                        "name": "$ Sales",
                        "description": "",
                        "kind": "measure",
                        "type": "numeric"
                    }
                ]
            },
            "data": {
                "values": []
            },
            "mark": {
                "type": "bar"
            },
            "encoding": {
                "x": {
                    "field": "__0__",
                    "type": "temporal"
                },
                "y": {
                    "field": "__1__",
                    "type": "quantitative"
                }
            }
        }`;

        const expectedComponents: IDenebTemplateAllocationComponents = {
            spec: `{
  "data": {
    "values": []
  },
  "mark": {
    "type": "bar"
  },
  "encoding": {
    "x": {
      "field": "__0__",
      "type": "temporal"
    },
    "y": {
      "field": "__1__",
      "type": "quantitative"
    }
  }
}`,
            config: `{}`
        };
        const resultWithoutConfig = getTemplateResolvedForPlaceholderAssignment(
            templateWithoutConfig,
            tabSize
        );
        expect(resultWithoutConfig).toEqual(expectedComponents);
    });
});

describe('getUpdatedExportMetadata', () => {
    const MOCK_USERMETA: UsermetaTemplate = {
        ...EXPECTED_METADATA_BASE,
        dataset: TEMPLATE_DATASET
    };
    it('should return the updated metadata with the provided options', () => {
        const options = {
            provider: 'vega' as SpecProvider,
            providerVersion: '6.0.0',
            interactivity: {
                tooltip: false,
                contextMenu: false,
                selection: false,
                selectionMode: 'multiple' as SelectionMode,
                dataPointLimit: 50,
                highlight: false
            },
            dataset: TEMPLATE_DATASET,
            config: '{"key": "value"}'
        };

        const expectedMetadata = {
            ...MOCK_USERMETA,
            deneb: {
                ...MOCK_USERMETA.deneb,
                provider: 'vega',
                providerVersion: '6.0.0'
            },
            interactivity: {
                tooltip: false,
                contextMenu: false,
                selection: false,
                selectionMode: 'multiple',
                dataPointLimit: 50,
                highlight: false
            },
            dataset: TEMPLATE_DATASET,
            config: '{"key": "value"}'
        };

        const result = getUpdatedExportMetadata(MOCK_USERMETA, options);
        expect(result).toEqual(expectedMetadata);
    });
    it('should return the original metadata when no options are provided', () => {
        const result = getUpdatedExportMetadata(MOCK_USERMETA, {});
        expect(result).toEqual(MOCK_USERMETA);
    });
    it('should return the original metadata with the provider and providerVersion unchanged when not provided in options', () => {
        const options = {
            interactivity: {
                tooltip: false,
                contextMenu: false,
                selection: false,
                selectionMode: 'multiple' as SelectionMode,
                dataPointLimit: 50,
                highlight: false
            },
            dataset: TEMPLATE_DATASET,
            config: '{"key": "value"}'
        };
        const expectedMetadata = {
            ...MOCK_USERMETA,
            interactivity: {
                tooltip: false,
                contextMenu: false,
                selection: false,
                selectionMode: 'multiple',
                dataPointLimit: 50,
                highlight: false
            },
            dataset: TEMPLATE_DATASET,
            config: '{"key": "value"}'
        };
        const result = getUpdatedExportMetadata(MOCK_USERMETA, options);
        expect(result).toEqual(expectedMetadata);
    });
});

describe('getValidatedTemplate', () => {
    const MOCK_CONTENT = `{
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "usermeta": {
            "deneb": {
                "build": "1.6.0.0",
                "metaVersion": 1,
                "provider": "vegaLite",
                "providerVersion": "5.15.0"
            },
            "interactivity": {
                "tooltip": true,
                "contextMenu": true,
                "selection": true,
                "highlight": true,
                "dataPointLimit": 50
            },
            "information": {
                "name": "Compact Bar Chart",
                "description": "A bar char, with the category labels at the base of the bar, rather than as a separate axis label. Data labels are also at the end of each bar.",
                "author": "DM-P",
                "uuid": "42b0e8bb-8538-4510-bb95-1c5a0c5188ac",
                "generated": "2023-09-22T01:15:02.162Z"
            },
            "dataset": [
                {
                    "key": "__0__",
                    "name": "Category",
                    "description": "Category for the bar chart's y-axis.",
                    "type": "text",
                    "kind": "column"
                },
                {
                    "key": "__1__",
                    "name": "Measure",
                    "description": "Measure to display along the bar chart's x-axis.",
                    "type": "numeric",
                    "kind": "measure"
                }
            ]
        },
        "config": {
          "view": {
            "stroke": "transparent"
          }
        },
        "data": {
          "values": []
        },
        "mark": {
          "type": "bar"
        },
        "encoding": {
          "x": {
            "field": "__0__",
            "type": "temporal"
          },
          "y": {
            "field": "__1__",
            "type": "quantitative"
          }
        }
    }`;

    const MOCK_TAB_SIZE = 2;

    it('should return valid template with import state "Success"', () => {
        const result = getValidatedTemplate(MOCK_CONTENT, MOCK_TAB_SIZE);
        expect(result).toEqual({
            candidates: {
                spec: `{
  "data": {
    "values": []
  },
  "mark": {
    "type": "bar"
  },
  "encoding": {
    "x": {
      "field": "__0__",
      "type": "temporal"
    },
    "y": {
      "field": "__1__",
      "type": "quantitative"
    }
  }
}`,
                config: `{\n  "view": {\n    "stroke": "transparent"\n  }\n}`
            },
            importFile: MOCK_CONTENT,
            importState: 'Success',
            metadata: {
                deneb: {
                    build: '1.6.0.0',
                    metaVersion: 1,
                    provider: 'vegaLite',
                    providerVersion: '5.15.0'
                },
                interactivity: {
                    tooltip: true,
                    contextMenu: true,
                    selection: true,
                    highlight: true,
                    dataPointLimit: 50
                },
                information: {
                    name: 'Compact Bar Chart',
                    description:
                        'A bar char, with the category labels at the base of the bar, rather than as a separate axis label. Data labels are also at the end of each bar.',
                    author: 'DM-P',
                    uuid: '42b0e8bb-8538-4510-bb95-1c5a0c5188ac',
                    generated: '2023-09-22T01:15:02.162Z'
                },
                dataset: [
                    {
                        key: '__0__',
                        name: 'Category',
                        description: "Category for the bar chart's y-axis.",
                        type: 'text',
                        kind: 'column'
                    },
                    {
                        key: '__1__',
                        name: 'Measure',
                        description:
                            "Measure to display along the bar chart's x-axis.",
                        type: 'numeric',
                        kind: 'measure'
                    }
                ],
                config: `{\n  "view": {\n    "stroke": "transparent"\n  }\n}`
            }
        });
    });
    it('should return invalid template with import state "None" if not valid JSON', () => {
        const invalidContent = 'invalid-json';
        const result = getValidatedTemplate(invalidContent, MOCK_TAB_SIZE);
        expect(result).toEqual({
            candidates: null,
            importFile: null,
            importState: 'Error',
            metadata: null
        });
    });
    it('should return invalid template with import state "None" if valid JSON, but not valid template', () => {
        const invalidContent = '{}';
        const result = getValidatedTemplate(invalidContent, MOCK_TAB_SIZE);
        expect(result).toEqual({
            candidates: null,
            importFile: null,
            importState: 'Error',
            metadata: null
        });
    });
    it('should return invalid template with import state "None" if some metadata can be extracted from JSON, doesn\'t fully validate', () => {
        const invalidContent = `{
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "usermeta": {
                "deneb": {
                    "build": "1.6.0.0",
                    "metaVersion": 1,
                    "provider": "vegaLite",
                    "providerVersion": "5.15.0"
                },
                "dataset": [
                    {
                        "key": "__0__",
                        "name": "Category",
                        "description": "Category for the bar chart's y-axis.",
                        "type": "text",
                        "kind": "column"
                    },
                    {
                        "key": "__1__",
                        "name": "Measure",
                        "description": "Measure to display along the bar chart's x-axis.",
                        "type": "numeric",
                        "kind": "measure"
                    }
                ]
            },
            "config": {
              "view": {
                "stroke": "transparent"
              }
            },
            "data": {
              "values": []
            },
            "mark": {
              "type": "bar"
            },
            "encoding": {
              "x": {
                "field": "__0__",
                "type": "temporal"
              },
              "y": {
                "field": "__1__",
                "type": "quantitative"
              }
            }
        }`;
        const result = getValidatedTemplate(invalidContent, MOCK_TAB_SIZE);
        expect(result).toEqual({
            candidates: null,
            importFile: null,
            importState: 'Error',
            metadata: null
        });
    });
});
