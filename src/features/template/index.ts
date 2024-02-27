import * as INCLUDED_TEMPLATES from './included';
import { TSpecProvider } from '../../core/vega';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { getTemplateMetadata } from '@deneb-viz/json-processing';
import { DenebTemplatesIncluded } from '@deneb-viz/core-dependencies';

export { getExportTemplate } from '../visual-export/logic';
export {
    TEMPLATE_DATASET_FIELD_PROPS,
    TEMPLATE_INFORMATION_PROPS,
    getFieldsInUseFromSpec,
    getReducedPlaceholdersForMetadata,
    getTemplatedSpecification,
    getTemplatePlaceholderKey,
    resolveVisualMetaToDatasetField
} from './fields';
export {
    BASE64_BLANK_IMAGE,
    dispatchPreviewImage,
    getCombinedBase64ImageWithMime,
    isBase64Image
} from './preview-image';
export { PreviewImage } from './components/preview-image';
export { TemplateDataset } from './components/template-dataset';

/**
 * Provides a list of included templates for the specified provider.
 */
export const getIncludedTemplates = (): DenebTemplatesIncluded => ({
    vega: INCLUDED_TEMPLATES.vega.map((t) => t()),
    vegaLite: INCLUDED_TEMPLATES.vegaLite.map((t) => t())
});

/**
 * For a supplied provider and name, extract the template from the included
 * lists of templates.
 */
export const getTemplateByProviderandName = (
    provider: TSpecProvider,
    name: string
): Spec | TopLevelSpec => {
    const templates = <Spec[]>getIncludedTemplates()[provider];
    return templates?.find(
        (t) =>
            getTemplateMetadata(JSON.stringify(t))?.information?.name === name
    );
};
