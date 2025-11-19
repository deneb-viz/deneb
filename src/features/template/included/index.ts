/**
 * Templates included with Deneb, and used to create from the appropriate
 * language provider's menu in the dialog.
 */

import { BaseData } from 'vega';

import { getCombinedBase64ImageWithMime } from '../preview-image';
import { THUMBNAIL_IMAGES } from './thumbnail-images';
import { getNewTemplateMetadata } from '@deneb-viz/json-processing';
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

/**
 * Included templates are exported using the provider shorthand, so that they
 * can be looked-up by provider name in the UI.
 */
export { VEGA_INCLUDED_TEMPLATES as vega } from './vega';
export { VEGA_LITE_INCLUDED_TEMPLATES as vegaLite } from './vega-lite';

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
    previewImageKey?: string
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
                    getCombinedBase64ImageWithMime(
                        THUMBNAIL_IMAGES[previewImageKey]
                    )) ||
                undefined
        }
    };
};
