import { type BaseData, type Spec } from 'vega';
import { type TopLevelSpec } from 'vega-lite';

import { THUMBNAIL_IMAGES } from './thumbnail-images';
import {
    getNewTemplateMetadata,
    getTemplateMetadata
} from '@deneb-viz/json-processing';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import {
    type UsermetaInformation,
    type UsermetaTemplate
} from '@deneb-viz/template-usermeta';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import {
    APPLICATION_INFORMATION_CONFIGURATION,
    PROVIDER_VERSION_CONFIGURATION
} from '@deneb-viz/configuration';
import { getBase64ImageWithMime } from '@deneb-viz/utils/base64';
import { type DenebTemplateCatalog } from './types';
import { VEGA_INCLUDED_TEMPLATES } from './vega';
import { VEGA_LITE_INCLUDED_TEMPLATES } from './vega-lite';

/**
 * Standard dataset binding for specifications.
 */
export const getDenebTemplateDatasetRef = (): BaseData => ({
    name: DATASET_DEFAULT_NAME
});

/**
 * Default author name for inbuilt templates.
 */
const DENEB_TEMPLATE_AUTHOR_NAME = 'Deneb';

/**
 * Base metadata for a new Deneb template. This gives you a starting point for
 * spreading-in new metadata fields for UI-created templates, or adding an
 * included template.
 */
export const getNewIncludedTemplateMetadata = (
    provider: SpecProvider,
    name: string,
    description: string = '',
    previewImageKey?: keyof typeof THUMBNAIL_IMAGES
): Partial<UsermetaTemplate> => {
    const metadata = getNewTemplateMetadata({
        buildVersion: APPLICATION_INFORMATION_CONFIGURATION.version,
        provider,
        providerVersion: PROVIDER_VERSION_CONFIGURATION[provider]
    });
    return {
        ...metadata,
        information: <UsermetaInformation>{
            ...metadata.information,
            name,
            description,
            author: DENEB_TEMPLATE_AUTHOR_NAME,
            previewImageBase64PNG:
                (previewImageKey &&
                    getBase64ImageWithMime(
                        THUMBNAIL_IMAGES[previewImageKey]
                    )) ||
                undefined
        }
    };
};

/**
 * Provides a list of included templates for the specified provider.
 */
export const getIncludedTemplates = (): DenebTemplateCatalog => ({
    vega: VEGA_INCLUDED_TEMPLATES.map((t) => t()),
    vegaLite: VEGA_LITE_INCLUDED_TEMPLATES.map((t) => t())
});

/**
 * For a supplied provider and name, extract the template from the included
 * lists of templates.
 */
export const getTemplateByProviderAndName = (
    provider: SpecProvider,
    name: string
): Spec | TopLevelSpec | undefined => {
    const templates = <Spec[]>getIncludedTemplates()[provider];
    return templates?.find(
        (t) =>
            getTemplateMetadata(JSON.stringify(t))?.information?.name === name
    );
};
