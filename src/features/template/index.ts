import cloneDeep from 'lodash/cloneDeep';
import { v4 as uuidv4 } from 'uuid';

import * as INCLUDED_TEMPLATES from './included';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    ITemplateInformation
} from './schema';
import { IDenebTemplatesIncluded } from './types';
import { TSpecProvider } from '../../core/vega';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import {
    getConfig,
    getVisualMetadata,
    providerVersions
} from '../../core/utils/config';

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
    TDatasetFieldType,
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    ITemplateInteractivityOptions
} from './schema';
export {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from './types';
export {
    BASE64_BLANK_IMAGE,
    PREVIEW_IMAGE_CAP_SIZE,
    dispatchPreviewImage,
    getCombinedBase64ImageWithMime,
    isBase64Image
} from './preview-image';
export { PreviewImage } from './components/preview-image';
export { TemplateDataset } from './components/template-dataset';

const SETTINGS_DEFAULTS = getConfig().propertyDefaults;

export const TEMPLATE_METADATA_VERSION = 1;

/**
 * For a given array of template dataset fields, confirm that they all have a
 * field allocated for assignment later on.
 */
export const areAllTemplateFieldsAssigned = (fields: ITemplateDatasetField[]) =>
    fields?.length === 0 ||
    fields?.filter((f) => !f.suppliedObjectName)?.length === 0 ||
    false;

/**
 * Provides a list of included templates for the specified provider.
 */
export const getIncludedTemplates = (): IDenebTemplatesIncluded => ({
    vega: INCLUDED_TEMPLATES.vega.map((t) => t()),
    vegaLite: INCLUDED_TEMPLATES.vegaLite.map((t) => t())
});

/**
 * Base metadata for a new Deneb template. This gives you a starting point for
 * spreading-in new metadata fields for UI-created templates, or adding an
 * included template.
 */
export const getNewTemplateMetadata = (
    provider: TSpecProvider
): Partial<IDenebTemplateMetadata> => ({
    information: <ITemplateInformation>{
        uuid: uuidv4(),
        generated: new Date().toISOString()
    },
    deneb: {
        build: getVisualMetadata().version,
        metaVersion: TEMPLATE_METADATA_VERSION,
        provider,
        providerVersion: providerVersions[provider]
    },
    interactivity: {
        tooltip: SETTINGS_DEFAULTS.vega.enableTooltips,
        contextMenu: SETTINGS_DEFAULTS.vega.enableContextMenu,
        selection: SETTINGS_DEFAULTS.vega.enableSelection,
        dataPointLimit: SETTINGS_DEFAULTS.vega.selectionMaxDataPoints,
        highlight: SETTINGS_DEFAULTS.vega.enableHighlight
    },
    dataset: []
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

/**
 * Attempt to resolve the Deneb-specific metadata from a specification.
 */
export const getTemplateMetadata = (
    template: string
): IDenebTemplateMetadata => {
    const tree = JSON.parse(template);
    return cloneDeep(tree?.usermeta);
};

/**
 * Confirms that the supplied template metadata contains dataset entries, and
 * that placeholders are needed to populate them.
 */
export const templateHasPlaceholders = (template: IDenebTemplateMetadata) =>
    template?.dataset?.length > 0;
