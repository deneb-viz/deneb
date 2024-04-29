import powerbi from 'powerbi-visuals-api';

import omit from 'lodash/omit';
import {
    utils,
    SpecProvider,
    UsermetaInformation,
    UsermetaTemplate,
    TEMPLATE_USERMETA_VERSION,
    PROPERTIES_DEFAULTS,
    ICreateSliceSetImportFile,
    IDenebTemplateAllocationComponents,
    UsermetaDatasetField,
    ICreateSliceProperties,
    UsermetaInteractivity,
    DATASET_CORE_ROLE_NAME,
    TrackedFields,
    UsermetaDatasetFieldType
} from '@deneb-viz/core-dependencies';
import {
    getJsoncNodeValue,
    getJsoncStringAsObject,
    getJsoncTree,
    getModifiedJsoncByPath,
    getTextFormattedAsJsonC
} from './processing';
import { getFieldPattern } from './field-tracking';
import { getProviderValidator } from './validation';
import { applyEdits, modify } from 'jsonc-parser';

/**
 * If we cannot resolve a provider, this is the default to assign.
 */
const DEFAULT_PROVIDER: SpecProvider = 'vega';

/**
 * If a template does not validate, this is the object to return.
 */
const INVALID_TEMPLATE_OPTIONS: ICreateSliceSetImportFile = {
    candidates: null,
    importFile: null,
    importState: 'Error',
    metadata: null
};

/**
 * For version 1.0, we did not populate versions for tracking purposes, so we keep a list of the initial version that
 * we use to coalesce them if they're missing from a loaded template.
 */
export const PROVIDER_RESOURCES = {
    deneb: {
        legacyVersion: '1.0.0.57'
    },
    vega: {
        schemaUrl: 'https://vega.github.io/schema/vega/v5.json',
        legacyVersion: '5.21.0'
    },
    vegaLite: {
        schemaUrl: 'https://vega.github.io/schema/vega-lite/v5.json',
        legacyVersion: '5.1.1'
    }
};

/**
 * Produce a complete export template with all necessary substitutions and metadata in place.
 */
export const getExportTemplate = (options: {
    informationTranslationPlaceholders: {
        [key: string]: string;
    };
    metadata: UsermetaTemplate;
    tokenizedSpec: string;
    trackedFields: TrackedFields;
}) => {
    const { informationTranslationPlaceholders, metadata, tokenizedSpec, trackedFields } = options;
    const newMetadata = getPublishableUsermeta(metadata, { informationTranslationPlaceholders, trackedFields });
    const withUsermeta = applyEdits(
        tokenizedSpec,
        modify(tokenizedSpec, ['usermeta'], newMetadata, {
            getInsertionIndex: () => 0
        })
    );
    const withSchema = applyEdits(
        withUsermeta,
        modify(withUsermeta, ['$schema'], PROVIDER_RESOURCES[newMetadata.deneb.provider].schemaUrl, {
            getInsertionIndex: () => 0
        })
    );
    return getTextFormattedAsJsonC(withSchema, 2);
};

/**
 * When we initialize a new template for import (or when intializing the store), this provides the default values for
 * the create slice properties (except for methods).
 */
export const getNewCreateFromTemplateSliceProperties = (): Partial<ICreateSliceProperties> => ({
    candidates: null,
    importFile: null,
    importState: 'None',
    metadata: null,
    metadataAllDependenciesAssigned: false,
    metadataAllFieldsAssigned: false,
    metadataDrilldownAssigned: false,
    mode: 'import'
});

/**
 * Base metadata for a new Deneb template. This gives you a starting point for spreading-in new metadata fields for
 * UI-created templates, or adding an included template.
 */
export const getNewTemplateMetadata = (options: {
    buildVersion: string;
    provider: SpecProvider;
    providerVersion: string;
}): Partial<UsermetaTemplate> => ({
    information: <UsermetaInformation>{
        uuid: utils.getNewUuid(),
        generated: new Date().toISOString(),
        previewImageBase64PNG: utils.getBase64ImagePngBlank(),
        name: '',
        description: '',
        author: ''
    },
    deneb: {
        build: options.buildVersion,
        metaVersion: TEMPLATE_USERMETA_VERSION,
        provider: options.provider,
        providerVersion: options.providerVersion
    },
    interactivity: {
        tooltip: PROPERTIES_DEFAULTS.vega.enableTooltips,
        contextMenu: PROPERTIES_DEFAULTS.vega.enableContextMenu,
        selection: PROPERTIES_DEFAULTS.vega.enableSelection,
        selectionMode: PROPERTIES_DEFAULTS.vega.selectionMode,
        dataPointLimit: PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints,
        highlight: PROPERTIES_DEFAULTS.vega.enableHighlight
    },
    config: '{}',
    dataset: []
});

/**
 * Ensure that usermeta is in its final, publishable state after all necessary substitutions and processing have been done.
 */
export const getPublishableUsermeta = (
    usermeta: UsermetaTemplate,
    options: {
        informationTranslationPlaceholders: {
            [key: string]: string;
        };
        trackedFields: TrackedFields;
    }
) => {
    return {
        ...usermeta,
        ...{
            information: {
                ...usermeta.information,
                name: usermeta.information.name || options.informationTranslationPlaceholders.name,
                description: usermeta.information.description || options.informationTranslationPlaceholders.description,
                author: usermeta.information.author || options.informationTranslationPlaceholders.author
            },
            dataset: usermeta?.[DATASET_CORE_ROLE_NAME].map((d) => {
                d.key = options.trackedFields?.[d.key]?.placeholder ?? d.key;
                return omit(d, ['namePlaceholder']);
            })
        }
    };
};

/**
 * For a given column or measure (or template placeholder), resolve its type
 * against the corresponding Power BI value descriptor.
 */
export const getResolvedValueDescriptor = (type: powerbi.ValueTypeDescriptor): UsermetaDatasetFieldType => {
    switch (true) {
        case type?.bool:
            return 'bool';
        case type?.text:
            return 'text';
        case type?.numeric:
            return 'numeric';
        case type?.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};

/**
 * For a given `DataViewMetadataColumn`, and its encoded name produces a new
 * `ITemplateDatasetField` object that can be used for templating purposes.
 */
export const getResolvedVisualMetadataToDatasetField = (
    metadata: powerbi.DataViewMetadataColumn,
    encodedName: string
): UsermetaDatasetField => {
    return {
        key: metadata.queryName ?? metadata.displayName ?? '',
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: getResolvedValueDescriptor(metadata.type as powerbi.ValueTypeDescriptor)
    };
};

/**
 * Attempt to resolve the provider information from the template's metadata.
 */
export const getTemplateProvider = (template: string): SpecProvider =>
    getTemplateMetadata(template)?.deneb?.provider ?? DEFAULT_PROVIDER;

/**
 * For all supplied template fields, perform a replace on all tokens and return the new spec.
 */
export const getTemplateReplacedForDataset = (spec: string, dataset: UsermetaDatasetField[]) =>
    dataset.reduce((result, value, index) => {
        const pattern = getFieldPattern(index);
        return result.replace(pattern, value.suppliedObjectName as string);
    }, spec);

/**
 * In v1.7, we moved the Config editor content into the `usermeta` object. Prior to this we merged the content in the
 * Spec and Config editor to the top-level spec. However, with the introduction of JSONC, this merge operation is no
 * longer possible. This function will take a legacy template and move the config content from the top-level spec to
 * the `usermeta` object, if it is not already present.
 */
export const getTemplateResolvedForLegacyConfig = (template: string, tabSize: number) => {
    const { config } = getTemplateMetadata(template);
    if (!config) {
        const tree = getJsoncTree(template);
        const newConfig = getTextFormattedAsJsonC(JSON.stringify(getJsoncNodeValue(tree)?.config || {}), tabSize);
        const appliedConfig = getModifiedJsoncByPath(template, ['usermeta', 'config'], newConfig);
        const removedConfig = getModifiedJsoncByPath(appliedConfig, ['config'], undefined);
        return removedConfig;
    }
    return template;
};

/**
 * We (unwisely) didn't populate the template metadata with the Vega/Vega-Lite version for the initial 1.0 build of
 * Deneb, so here we check the template for a suitable `providerVersion` and patch it with a legacy version as
 * appropriate.
 */
export const getTemplateResolvedForLegacyVersions = (provider: SpecProvider, template: string) => {
    const { deneb } = getTemplateMetadata(template);
    const legacyVersion = PROVIDER_RESOURCES[provider].legacyVersion;
    const providerVersion = deneb.providerVersion ?? legacyVersion;
    return getModifiedJsoncByPath(template, ['usermeta', 'deneb', 'providerVersion'], providerVersion);
};

/**
 * Process the template into separate `spec` and `config` string representations that can be used for substitution from
 * placeholder prior to being inserted into the editor.
 */
export const getTemplateResolvedForPlaceholderAssignment = (
    template: string,
    tabSize: number
): IDenebTemplateAllocationComponents => {
    const config = getTemplateMetadata(template)?.config || '{}';
    const keysToRemove = ['$schema', 'usermeta'];
    const spec = getTextFormattedAsJsonC(
        keysToRemove.reduce((result, key) => getModifiedJsoncByPath(result, [key], undefined), template),
        tabSize
    );
    return {
        spec,
        config
    };
};

/**
 * Attempt to resolve the Deneb-specific metadata from a specification and get as a new object.
 */
export const getTemplateMetadata = (template: string): UsermetaTemplate =>
    structuredClone(getJsoncStringAsObject(template)?.usermeta ?? {});

/**
 * Update the export metadata with the supplied options.
 */
export const getUpdatedExportMetadata = (
    metadata: UsermetaTemplate,
    options: {
        config?: string;
        dataset?: UsermetaDatasetField[];
        interactivity?: UsermetaInteractivity;
        provider?: SpecProvider;
        providerVersion?: string;
    }
) => {
    const { config, dataset, interactivity, provider, providerVersion } = options;
    return {
        ...metadata,
        deneb: {
            ...metadata.deneb,
            provider: provider ?? metadata.deneb.provider,
            providerVersion: providerVersion ?? metadata.deneb.providerVersion
        },
        interactivity: interactivity ?? metadata.interactivity,
        dataset: dataset ?? metadata.dataset,
        config: config ?? metadata.config
    };
};

/**
 * Perform validation of the supplied content, which should be a Vega or Vega-Lite specification containing a valid
 * `usermeta` object confirming to the Deneb JSON schema. If valid, this will return a suitable
 * `ICreateSliceSetImportFile` object with the necessary content for the rest of the import process. If invalid, this
 * will return an `ICreateSliceSetImportFile` object sufficient to indicate that the template is invalid. Either result
 * should be sufficient to pass to the application store.
 *
 * Throughout 1.x, we have some minor changes to the template structure, and these need to be managed:
 *  - From 1.1: we added the provider and visual version, so anything missing is assumed to be from before then and we
 *      populate the 'legacy' versions that were included in 1.0.
 *  - From 1.7: we store the Config editor content in the metadata rather than at the top-level, so if this is missing
 *      from the metadata, we need to move it there. Otherwise, we leave it alone and it will be present in the Spec
 *      editor as the original author intended.
 */
export const getValidatedTemplate = (content: string, tabSize: number): ICreateSliceSetImportFile => {
    try {
        if (!getJsoncStringAsObject(content)) return INVALID_TEMPLATE_OPTIONS;
        const provider = getTemplateProvider(content);
        const templateResolvedLegacy = getTemplateResolvedForLegacyVersions(provider, content);
        const templateResolvedLegacyConfig = getTemplateResolvedForLegacyConfig(templateResolvedLegacy, tabSize);
        const metadata = getTemplateMetadata(templateResolvedLegacyConfig);
        const validator = getProviderValidator({
            provider: 'denebUserMeta'
        });
        const valid = validator(metadata);
        if (valid) {
            const candidates = getTemplateResolvedForPlaceholderAssignment(templateResolvedLegacyConfig, tabSize);
            return {
                candidates,
                importFile: content,
                importState: 'Success',
                metadata
            };
        }
        return INVALID_TEMPLATE_OPTIONS;
    } catch (e) {
        return INVALID_TEMPLATE_OPTIONS;
    }
};
