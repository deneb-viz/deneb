import merge from 'lodash/merge';
import omit from 'lodash/omit';
import { v4 as uuidv4 } from 'uuid';

import { DATASET_NAME } from '../../constants';
import { getConfig } from '../../core/utils/config';
import {
    parseAndValidateContentJson,
    getJsonAsIndentedString
} from '../../core/utils/json';
import { TSpecProvider } from '../../core/vega';
import { getState } from '../../store';
import { TTemplateExportState } from '../template';
import {
    getTemplatedSpecification,
    getTemplatePlaceholderKey
} from '../template';
import { IDenebTemplateMetadata } from '../template/schema';
import { getI18nValue } from '../i18n';
import {
    APPLICATION_INFORMATION,
    PROPERTY_DEFAULTS,
    PROVIDER_VERSIONS
} from '../../../config';

/**
 * Combines spec, config and specified metadata to produce a valid JSON
 * template for export.
 */
export const getExportTemplate = () => {
    const { visualSettings } = getState();
    const { vega } = visualSettings;
    const { providerResources } = getConfig();
    const vSchema = (
        (vega.provider === 'vega' && providerResources.vega) ||
        providerResources.vegaLite
    ).schemaUrl;
    const baseObj = {
        $schema: vSchema,
        usermeta: {},
        config: {}
    };
    const usermeta = resolveExportUserMeta();
    const processedSpec = getTemplatedSpecification(
        visualSettings.vega.jsonSpec,
        usermeta?.[DATASET_NAME]
    );
    const outSpec = merge(
        baseObj,
        { usermeta: getPublishableUsermeta(usermeta) },
        {
            config: parseAndValidateContentJson(
                visualSettings.vega.jsonConfig,
                PROPERTY_DEFAULTS.vega.jsonConfig
            )?.result
        },
        JSON.parse(processedSpec)
    );
    return getJsonAsIndentedString(outSpec);
};

/**
 * Instantiates a new object for export template metadata, ready for population.
 */
export const getNewExportTemplateMetadata = (): IDenebTemplateMetadata => {
    const { metadataVersion } = getConfig().templates;
    return {
        deneb: {
            build: APPLICATION_INFORMATION.version,
            metaVersion: metadataVersion,
            provider: null,
            providerVersion: null
        },
        information: {
            name: null,
            description: null,
            uuid: uuidv4(),
            generated: null,
            author: null
        },
        dataset: []
    };
};

/**
 * Ensure that usermeta is in its final, publishable state after all
 * necessary substitutions and processing have been done.
 */
const getPublishableUsermeta = (usermeta: IDenebTemplateMetadata) => {
    return {
        ...usermeta,
        ...{
            dataset: usermeta?.[DATASET_NAME].map((d) =>
                omit(d, ['namePlaceholder'])
            )
        }
    };
};

/**
 * Generates a suitable `usermeta` object for the current `templateReducer`
 * state and provides suitable defaults if they are missing, so that generated
 * export templates make sense (as much as possible).
 */
const resolveExportUserMeta = (): IDenebTemplateMetadata => {
    const { metadataVersion } = getConfig().templates,
        {
            templateExportMetadata,
            templatePreviewImageDataUri,
            templateIncludePreviewImage
        } = getState(),
        { vega } = getState().visualSettings;
    return {
        deneb: {
            build: APPLICATION_INFORMATION.version,
            metaVersion: metadataVersion,
            provider: <TSpecProvider>vega.provider,
            providerVersion: PROVIDER_VERSIONS[vega.provider]
        },
        interactivity: {
            tooltip: vega.enableTooltips,
            contextMenu: vega.enableContextMenu,
            selection: vega.enableSelection,
            highlight: vega.enableHighlight,
            dataPointLimit: vega.selectionMaxDataPoints
        },
        information: {
            name:
                templateExportMetadata?.information?.name ||
                getI18nValue('Template_Export_Information_Name_Empty'),
            description:
                templateExportMetadata?.information?.description ||
                getI18nValue('Template_Export_Information_Description_Empty'),
            author:
                templateExportMetadata?.information?.author ||
                getI18nValue('Template_Export_Author_Name_Empty'),
            uuid: templateExportMetadata?.information?.uuid || uuidv4(),
            generated: new Date().toISOString(),
            previewImageBase64PNG: templateIncludePreviewImage
                ? templatePreviewImageDataUri
                : undefined
        },
        dataset: templateExportMetadata?.[DATASET_NAME].map((d, di) => {
            return {
                key: getTemplatePlaceholderKey(di),
                name: d.name || d.namePlaceholder,
                description: d.description || '',
                type: d.type,
                kind: d.kind,
                namePlaceholder: d.namePlaceholder
            };
        })
    };
};

/**
 * Persist the supplied export error information to the store.
 */
const updateExportError = () => {
    getState().updateTemplateExportError();
};

/**
 * Persist the supplied `TTemplateExportState` to Deneb's store.
 */
export const updateTemplateExportState = (state: TTemplateExportState) => {
    getState().updateTemplateExportState(state);
};

/**
 * Checks to see if current spec is valid and updates store state for UI accordingly.
 */
export const validateSpecificationForExport = () => {
    const {
        specification: { status }
    } = getState();
    updateTemplateExportState('Validating');
    if (status === 'valid') {
        updateTemplateExportState('Editing');
    } else {
        updateExportError();
    }
};
