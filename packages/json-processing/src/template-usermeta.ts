import {
    getJsoncNodeValue,
    getJsoncStringAsObject,
    getJsoncTree,
    getModifiedJsoncByPath,
    getTextFormattedAsJsonC
} from './processing';
import { getProviderValidator } from './validation';
import { applyEdits, modify } from 'jsonc-parser';
import { type TrackedFields } from './lib/field-tracking';
import {
    TEMPLATE_USERMETA_VERSION,
    type UsermetaInformation,
    type UsermetaInteractivity,
    type UsermetaTemplate
} from '@deneb-viz/template-usermeta';
import { getBase64ImagePngBlank } from '@deneb-viz/utils/base64';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import {
    getProviderSchemaUrl,
    type SpecProvider
} from '@deneb-viz/vega-runtime/embed';
import { replaceLegacySignalReferences } from '@deneb-viz/vega-runtime/signals';
import { getNewUuid } from '@deneb-viz/utils/crypto';
import {
    type DenebTemplateSetImportFilePayload,
    type DenebTemplateAllocationComponents,
    type DenebTemplateImportWorkingProperties,
    getFieldNameForExport
} from './lib/template-processing';
import { omit } from '@deneb-viz/utils/object';
import {
    getEncodedFieldName,
    getEscapedReplacerPattern,
    getPlaceholderKey,
    type UsermetaDatasetField
} from '@deneb-viz/data-core/field';
import { type SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
import {
    type SelectionMode,
    INTERACTIVITY_DEFAULTS
} from '@deneb-viz/powerbi-compat/interactivity';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

/**
 * If we cannot resolve a provider, this is the default to assign.
 */
const DEFAULT_PROVIDER: SpecProvider = 'vega';

/**
 * If a template does not validate, this is the object to return.
 */
const INVALID_TEMPLATE_OPTIONS: DenebTemplateSetImportFilePayload = {
    candidates: null,
    importFile: null,
    importState: 'Error',
    metadata: null
};

/**
 * Produce a complete export template with all necessary substitutions and metadata in place.
 */
export const getExportTemplate = (options: {
    informationTranslationPlaceholders: {
        [key: string]: string;
    };
    metadata: UsermetaTemplate;
    supportFieldConfiguration?: SupportFieldConfiguration;
    tokenizedSpec: string;
    trackedFields: TrackedFields;
}) => {
    const {
        informationTranslationPlaceholders,
        metadata,
        supportFieldConfiguration,
        tokenizedSpec,
        trackedFields
    } = options;
    const newMetadata = getPublishableUsermeta(metadata, {
        informationTranslationPlaceholders,
        supportFieldConfiguration,
        trackedFields
    });
    const withUsermeta = applyEdits(
        tokenizedSpec,
        modify(tokenizedSpec, ['usermeta'], newMetadata, {
            getInsertionIndex: () => 0
        })
    );
    const withSchema = applyEdits(
        withUsermeta,
        modify(
            withUsermeta,
            ['$schema'],
            getProviderSchemaUrl(newMetadata.deneb.provider),
            {
                getInsertionIndex: () => 0
            }
        )
    );
    return getTextFormattedAsJsonC(withSchema, 2);
};

const getFieldPatternByKey = (key: string) =>
    new RegExp(getEscapedReplacerPattern(key), 'g');

/**
 * When we initialize a new template for import (or when intializing the store), this provides the default values for
 * the create slice properties (except for methods).
 */
export const getNewCreateFromTemplateSliceProperties =
    (): DenebTemplateImportWorkingProperties => ({
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
    provider: SpecProvider | null;
    providerVersion: string | null;
}): Partial<UsermetaTemplate> => ({
    information: <UsermetaInformation>{
        uuid: getNewUuid(),
        generated: new Date().toISOString(),
        previewImageBase64PNG: getBase64ImagePngBlank(),
        name: '',
        description: '',
        author: ''
    },
    deneb: {
        build: options.buildVersion,
        metaVersion: TEMPLATE_USERMETA_VERSION,
        provider: options.provider ?? DEFAULT_PROVIDER,
        providerVersion: options.providerVersion ?? ''
    },
    interactivity: {
        tooltip: INTERACTIVITY_DEFAULTS.enableTooltips,
        contextMenu: INTERACTIVITY_DEFAULTS.enableContextMenu,
        contextMenuSelector: INTERACTIVITY_DEFAULTS.enableContextMenuSelector,
        selection: INTERACTIVITY_DEFAULTS.enableSelection,
        selectionMode: INTERACTIVITY_DEFAULTS.selectionMode as SelectionMode,
        dataPointLimit: INTERACTIVITY_DEFAULTS.selectionMaxDataPoints,
        highlight: INTERACTIVITY_DEFAULTS.enableHighlight
    },
    config: '{}',
    datasets: { [DATASET_DEFAULT_NAME]: [] }
});

/**
 * Extract per-field support field configuration from dataset entries and remap to actual
 * encoded field names supplied by the user during import. Each dataset entry may carry an
 * inline `supportFieldConfiguration` (the new template format). The `suppliedObjectName`
 * becomes the key in the returned record. Returns an empty object when no entries carry config.
 */
export const remapSupportFieldConfigurationForImport = (
    dataset: UsermetaDatasetField[]
): SupportFieldConfiguration => {
    const result: SupportFieldConfiguration = {};
    for (const field of dataset) {
        if (field.supportFieldConfiguration && field.suppliedObjectName) {
            result[field.suppliedObjectName] = field.supportFieldConfiguration;
        }
    }
    return result;
};

/**
 * Build a lookup from display name → TrackedFieldProperties. TrackedFields is keyed by
 * `field.id` (queryName), which differs from the display name used in supportFieldConfiguration
 * and in the export dataset array. This helper enables name-based lookups.
 */
const buildNameToTrackedFieldMap = (trackedFields: TrackedFields) => {
    const map = new Map<string, { placeholder: string }>();
    for (const tf of Object.values(trackedFields)) {
        map.set(tf.templateMetadata.name, { placeholder: tf.placeholder });
    }
    return map;
};

/**
 * Ensure that usermeta is in its final, publishable state after all necessary substitutions and processing have been done.
 */
export const getPublishableUsermeta = (
    usermeta: UsermetaTemplate,
    options: {
        informationTranslationPlaceholders: {
            [key: string]: string;
        };
        supportFieldConfiguration?: SupportFieldConfiguration;
        trackedFields: TrackedFields;
    }
) => {
    return {
        ...usermeta,
        ...{
            information: {
                ...usermeta.information,
                name:
                    usermeta.information.name ||
                    options.informationTranslationPlaceholders.name,
                description:
                    usermeta.information.description ||
                    options.informationTranslationPlaceholders.description,
                author:
                    usermeta.information.author ||
                    options.informationTranslationPlaceholders.author
            },
            datasets: (() => {
                const nameMap = buildNameToTrackedFieldMap(
                    options.trackedFields
                );
                const sourceDatasets = usermeta?.datasets ?? {
                    [DATASET_DEFAULT_NAME]: []
                };
                const processField = (d: UsermetaDatasetField) => {
                    const item = { ...d };
                    const tracked = nameMap.get(
                        item.namePlaceholder ?? item.name
                    );
                    item.key = tracked?.placeholder ?? item.key;
                    item.name = getFieldNameForExport(item);
                    const sfcKey = getEncodedFieldName(
                        item.namePlaceholder ?? item.name ?? ''
                    );
                    const fieldConfig =
                        options.supportFieldConfiguration?.[sfcKey];
                    if (fieldConfig) {
                        item.supportFieldConfiguration = fieldConfig;
                    }
                    return omit(item as unknown as Record<string, unknown>, [
                        'namePlaceholder'
                    ]) as Omit<UsermetaDatasetField, 'namePlaceholder'>;
                };
                return Object.fromEntries(
                    Object.entries(sourceDatasets).map(([name, fields]) => [
                        name,
                        (fields ?? []).map(processField)
                    ])
                );
            })()
        }
    };
};

/**
 * Attempt to resolve the provider information from the template's metadata.
 */
export const getTemplateProvider = (template: string): SpecProvider =>
    getTemplateMetadata(template)?.deneb?.provider ?? DEFAULT_PROVIDER;

/**
 * For all supplied template datasets, perform a key-based replace on all placeholder tokens
 * and return the new spec. Each field's `key` property (e.g., `__dataset.0__`) is matched
 * directly rather than deriving the pattern from the array index.
 * Also migrates any legacy signal references (pbiContainer → denebContainer).
 */
export const getTemplateReplacedForDataset = (
    spec: string,
    datasets: Record<string, UsermetaDatasetField[]>
) => {
    const migratedSpec = replaceLegacySignalReferences(spec).spec;
    return Object.values(datasets).reduce(
        (result, fields) =>
            fields.reduce((r, field) => {
                const pattern = getFieldPatternByKey(field.key);
                return r.replace(pattern, field.suppliedObjectName ?? '');
            }, result),
        migratedSpec
    );
};

/**
 * In v1.7, we moved the Config editor content into the `usermeta` object. Prior to this we merged the content in the
 * Spec and Config editor to the top-level spec. However, with the introduction of JSONC, this merge operation is no
 * longer possible. This function will take a legacy template and move the config content from the top-level spec to
 * the `usermeta` object, if it is not already present.
 */
export const getTemplateResolvedForLegacyConfig = (
    template: string,
    tabSize: number
) => {
    const { config } = getTemplateMetadata(template);
    if (!config) {
        const tree = getJsoncTree(template);
        const newConfig = getTextFormattedAsJsonC(
            JSON.stringify(getJsoncNodeValue(tree)?.config || {}),
            tabSize
        );
        const appliedConfig = getModifiedJsoncByPath(
            template,
            ['usermeta', 'config'],
            newConfig
        );
        const removedConfig = getModifiedJsoncByPath(
            appliedConfig,
            ['config'],
            undefined
        );
        return removedConfig;
    }
    return template;
};

/**
 * V1 templates use `usermeta.dataset` (a flat array) with `__N__` placeholders. V2 uses `usermeta.datasets` (a keyed
 * object) with `__datasetName.N__` placeholders. This migration converts the old structure to the new one, rewriting
 * both the usermeta property and placeholder references in the spec body.
 *
 * If `usermeta.datasets` already exists, the template is assumed to be v2 and passed through unchanged.
 * If both `usermeta.dataset` and `usermeta.datasets` exist, the template is passed through unchanged — schema
 * validation will reject it via `additionalProperties: false`.
 */
export const getTemplateResolvedForLegacyDataset = (
    template: string
): string => {
    const rawUsermeta = getJsoncStringAsObject(template)?.usermeta as
        | Record<string, unknown>
        | undefined;
    if (!rawUsermeta) return template;

    const hasLegacyDataset = Array.isArray(rawUsermeta['dataset']);
    const hasNewDatasets = rawUsermeta['datasets'] !== undefined;

    if (!hasLegacyDataset || hasNewDatasets) {
        return template;
    }

    const legacyDataset = rawUsermeta['dataset'] as UsermetaDatasetField[];

    const migratedFields = legacyDataset.map((field, i) => ({
        ...field,
        key: getPlaceholderKey(DATASET_DEFAULT_NAME, i)
    }));

    let result = getModifiedJsoncByPath(template, ['usermeta', 'datasets'], {
        [DATASET_DEFAULT_NAME]: migratedFields
    });
    result = getModifiedJsoncByPath(result, ['usermeta', 'dataset'], undefined);

    for (let i = legacyDataset.length - 1; i >= 0; i--) {
        const oldPattern = new RegExp(
            getEscapedReplacerPattern(`__${i}__`),
            'g'
        );
        const newKey = getPlaceholderKey(DATASET_DEFAULT_NAME, i);
        result = result.replace(oldPattern, newKey);
    }

    return result;
};

/**
 * We (unwisely) didn't populate the template metadata with the Vega/Vega-Lite version for the initial 1.0 build of
 * Deneb, so here we check the template for a suitable `providerVersion` and patch it with a legacy version as
 * appropriate.
 */
export const getTemplateResolvedForLegacyVersions = (
    provider: SpecProvider,
    template: string
) => {
    const { deneb } = getTemplateMetadata(template);
    const legacyVersion =
        PROVIDER_RESOURCE_CONFIGURATION[provider].legacyVersion;
    const providerVersion = deneb.providerVersion ?? legacyVersion;
    return getModifiedJsoncByPath(
        template,
        ['usermeta', 'deneb', 'providerVersion'],
        providerVersion
    );
};

/**
 * Process the template into separate `spec` and `config` string representations that can be used for substitution from
 * placeholder prior to being inserted into the editor.
 */
export const getTemplateResolvedForPlaceholderAssignment = (
    template: string,
    tabSize: number
): DenebTemplateAllocationComponents => {
    const config = getTemplateMetadata(template)?.config || '{}';
    const keysToRemove = ['$schema', 'usermeta'];
    const spec = getTextFormattedAsJsonC(
        keysToRemove.reduce(
            (result, key) => getModifiedJsoncByPath(result, [key], undefined),
            template
        ),
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
        datasets?: Record<string, UsermetaDatasetField[]>;
        interactivity?: UsermetaInteractivity;
        provider?: SpecProvider;
        providerVersion?: string;
    }
) => {
    const { config, datasets, interactivity, provider, providerVersion } =
        options;
    return {
        ...metadata,
        deneb: {
            ...metadata.deneb,
            provider: provider ?? metadata.deneb.provider,
            providerVersion: providerVersion ?? metadata.deneb.providerVersion
        },
        interactivity: interactivity ?? metadata.interactivity,
        datasets: datasets ?? metadata.datasets,
        config: config ?? metadata.config
    };
};

/**
 * Perform validation of the supplied content, which should be a Vega or Vega-Lite specification containing a valid
 * `usermeta` object confirming to the Deneb JSON schema. If valid, this will return a suitable
 * `DenebTemplateSetImportFilePayload` object with the necessary content for the rest of the import process. If invalid, this
 * will return an `DenebTemplateSetImportFilePayload` object sufficient to indicate that the template is invalid. Either result
 * should be sufficient to pass to the application store.
 *
 * Throughout 1.x, we have some minor changes to the template structure, and these need to be managed:
 *  - From 1.1: we added the provider and visual version, so anything missing is assumed to be from before then and we
 *      populate the 'legacy' versions that were included in 1.0.
 *  - From 1.7: we store the Config editor content in the metadata rather than at the top-level, so if this is missing
 *      from the metadata, we need to move it there. Otherwise, we leave it alone and it will be present in the Spec
 *      editor as the original author intended.
 */
export const getValidatedTemplate = (
    content: string,
    tabSize: number
): DenebTemplateSetImportFilePayload => {
    try {
        if (!getJsoncStringAsObject(content)) return INVALID_TEMPLATE_OPTIONS;
        const provider = getTemplateProvider(content);
        const templateResolvedLegacy = getTemplateResolvedForLegacyVersions(
            provider,
            content
        );
        const templateResolvedLegacyConfig = getTemplateResolvedForLegacyConfig(
            templateResolvedLegacy,
            tabSize
        );
        const templateResolvedLegacyDataset =
            getTemplateResolvedForLegacyDataset(templateResolvedLegacyConfig);
        const metadata = getTemplateMetadata(templateResolvedLegacyDataset);
        const validator = getProviderValidator();
        const valid = validator(metadata);
        if (valid) {
            const candidates = getTemplateResolvedForPlaceholderAssignment(
                templateResolvedLegacyDataset,
                tabSize
            );
            return {
                candidates,
                importFile: content,
                importState: 'Success',
                metadata
            };
        }
        return INVALID_TEMPLATE_OPTIONS;
    } catch {
        return INVALID_TEMPLATE_OPTIONS;
    }
};
