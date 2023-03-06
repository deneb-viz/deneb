import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import Ajv, { ErrorObject } from 'ajv';

import has from 'lodash/has';
import set from 'lodash/set';

import * as schema_v1 from '../../../schema/deneb-template-usermeta-v1.json';
import { getJsonAsIndentedString } from '../../core/utils/json';
import { TSpecProvider } from '../../core/vega';
import { getState } from '../../store';
import {
    IDenebTemplateMetadata,
    ITemplateInteractivityOptions
} from '../template/schema';
import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import {
    getDenebVersionObject,
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import {
    getReducedPlaceholdersForMetadata,
    TTemplateImportState
} from '../template';
import { getConfig } from '../../core/utils/config';
import { i18nValue } from '../../core/ui/i18n';
import { ITemplateImportPayload } from '../../store/template';
import { DATASET_NAME } from '../../constants';

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
export const createFromTemplate = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec
) => {
    const jsonSpec = getReplacedTemplate(template);
    const jsonConfig = getJsonAsIndentedString(template.config);
    const interactivity = getInteractivityPropsFromTemplate(template);
    const specProvider: TSpecProvider =
        provider || template?.usermeta?.['deneb']?.['provider'];
    const { renewEditorFieldsInUse } = getState();
    updateObjectProperties(
        resolveObjectProperties([
            getDenebVersionObject(),
            {
                objectName: 'vega',
                properties: [
                    ...[
                        { name: 'provider', value: provider },
                        { name: 'jsonSpec', value: jsonSpec },
                        { name: 'jsonConfig', value: jsonConfig },
                        { name: 'isNewDialogOpen', value: false },
                        getProviderVersionProperty(specProvider)
                    ],
                    ...resolveInteractivityProps(interactivity)
                ]
            }
        ])
    );
    renewEditorFieldsInUse();
    specEditorService.setText(jsonSpec);
    configEditorService.setText(jsonConfig);
};

/**
 * Enumerate a template's placeholders and confirm they all have values
 * supplied by the user. If a template doesn't have any placeholders then this
 * will also be regarded as fulfilled.
 */
export const getImportPlaceholderResolutionStatus = (
    template: Spec | TopLevelSpec
) => {
    const usermeta = <IDenebTemplateMetadata>template?.usermeta;
    return (
        !usermeta?.[DATASET_NAME] ||
        usermeta?.[DATASET_NAME]?.length === 0 ||
        usermeta?.[DATASET_NAME].filter((ph) => !ph.suppliedObjectName)
            .length === 0
    );
};

/**
 * For supplied template, ensure that we can obtain interactivity properties
 * from it.
 */
const getInteractivityPropsFromTemplate = (template: Spec | TopLevelSpec) =>
    (<IDenebTemplateMetadata>template?.usermeta)?.interactivity || null;

/**
 * For a supplied template, substitute placeholder values and return a
 * stringified representation of the object.
 */
const getReplacedTemplate = (template: Spec | TopLevelSpec) => {
    let templateToApply = { ...template };
    delete templateToApply.$schema;
    delete templateToApply.config;
    delete templateToApply.usermeta;
    const { dataset } = <IDenebTemplateMetadata>template?.usermeta || {};
    const spec = getJsonAsIndentedString(templateToApply);
    return getReducedPlaceholdersForMetadata(dataset, spec);
};

/**
 * We (unwisely) didn't populate the template metadata with the Vega/Vega-Lite
 *  version for initial builds of Deneb, so here we check the template for a
 * suitable `providerVersion` and patch it with a legacy version as appropriate.
 */
const getTemplateResolvedForLegacyVersions = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec
) => {
    const deneb = (<IDenebTemplateMetadata>template?.usermeta)?.deneb;
    const legacyVersion =
        (provider === 'vega' &&
            getConfig().providerResources.vega.legacyVersion) ||
        getConfig().providerResources.vegaLite.legacyVersion;
    const providerVersion = has(deneb, 'providerVersion')
        ? deneb.providerVersion
        : legacyVersion;
    return set(template, 'usermeta.deneb.providerVersion', providerVersion);
};

/**
 * When a template JSON file is selected for import, this defines the logic for
 * reading the file and parsing it to ensure that it is both valid JSON, and
 * also contains the necessary metadata to provide data role substitution to
 * the end-user. This will dispatch the necessary state to the store for
 * further action as required.
 */
const onReaderLoad = (event: ProgressEvent<FileReader>, templateFile: File) => {
    updateImportState('Validating');
    let templateFileRawContent = event.target.result.toString(),
        template: Spec | TopLevelSpec;
    try {
        template = JSON.parse(templateFileRawContent);
    } catch (e) {
        updateImportError('Template_Import_Invalid_Json');
        return;
    }
    const ajv = new Ajv({ format: 'full' });
    const provider: TSpecProvider = template?.usermeta?.['deneb']?.['provider'];
    const templateToApply = getTemplateResolvedForLegacyVersions(
        provider,
        template
    );
    if (ajv.validate(schema_v1, templateToApply?.usermeta)) {
        updateImportSuccess({
            templateFile,
            templateFileRawContent,
            templateToApply,
            provider
        });
    } else {
        updateImportError('Template_Import_Not_Deneb', ajv.errors);
    }
};

/**
 * Attempt to load the selected template JSON file and validate it.
 */
export const onTemplateFileSelect = (files: FileList) => {
    updateImportState('Supplied');
    const reader = new FileReader();
    if (files?.length === 1 && files[0]?.type === 'application/json') {
        updateImportState('Loading');
        const file = files[0];
        reader.onload = (event) => onReaderLoad(event, file);
        reader.readAsText(file);
    } else {
        updateImportError('Template_Import_Incorrect_Type');
    }
};

/**
 * If we have resolved interactivity props from the template, create appropriate persistence properties
 */
const resolveInteractivityProps = (
    interactivity: ITemplateInteractivityOptions
): IPersistenceProperty[] =>
    (interactivity && [
        { name: 'enableTooltips', value: interactivity.tooltip },
        { name: 'enableContextMenu', value: interactivity.contextMenu },
        { name: 'enableHighlight', value: interactivity.highlight || false },
        { name: 'enableSelection', value: interactivity.selection },
        { name: 'selectionMaxDataPoints', value: interactivity.dataPointLimit }
    ]) ||
    [];

export const resolveTemplatesForProvider = () => {
    const { templateProvider, vega, vegaLite } = getState();
    return (templateProvider === 'vegaLite' && vegaLite) || vega;
};

/**
 * Persist the supplied import error information to the store.
 */
const updateImportError = (i18nKey: string, errors: ErrorObject[] = []) => {
    getState().updateTemplateImportError({
        templateImportErrorMessage: i18nValue(i18nKey),
        templateSchemaErrors: errors
    });
};

/**
 * Persist the supplied `TTemplateImportState` to Deneb's store.
 */
const updateImportState = (state: TTemplateImportState) => {
    getState().updateTemplateImportState(state);
};

/**
 * Persist the resolved template payload to the store.
 */
const updateImportSuccess = (payload: ITemplateImportPayload) => {
    getState().updateTemplateImportSuccess(payload);
};
