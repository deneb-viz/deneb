/**
 * Templates included with Deneb, and used to create from the appropriate
 * language provider's menu in the dialog.
 */

import { BaseData } from 'vega';

import { getCombinedBase64ImageWithMime } from '../preview-image';
import { THUMBNAIL_IMAGES } from './thumbnail-images';
import { TSpecProvider } from '../../../core/vega';
import { IDenebTemplateMetadata, ITemplateInformation } from '../schema';
import { getNewTemplateMetadata } from '..';
import { DATASET_NAME } from '../../../constants';

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
    name: DATASET_NAME
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
    provider: TSpecProvider,
    name: string,
    description: string = '',
    previewImageKey?: string
): Partial<IDenebTemplateMetadata> => {
    const metadata = getNewTemplateMetadata(provider);
    return {
        ...metadata,
        information: <ITemplateInformation>{
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
