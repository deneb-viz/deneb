import Ajv from 'ajv';
import ErrorObject = Ajv.ErrorObject;
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { v4 as uuidv4 } from 'uuid';

import { getConfig, getVisualMetadata } from '../config/public';
import { getHostLM } from '../i18n/public';
import {
    determineProviderFromSpec,
    TSpecProvider
} from '../specification/public';
import { getState, getStore } from '../store/public';
import { IDenebTemplateMetadata } from '../../schema/template-v1'; // TODO: Move to template API
import {
    templateExportError,
    templateImportError,
    templateImportSuccess,
    updateTemplateImportState
} from '../../store/templateReducer';

import { ITemplateImportPayload, TTemplateImportState } from './public';

import * as schema_v1 from '../../schema/deneb-template-usermeta-v1.json'; // TODO: Needs moving into API (Template)

export const getEscapedReplacerPattern = (value: string) =>
    value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');

export const getExportFieldTokenPatterns = (name: string) => {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        `(")(${namePattern})(")`,
        `(\\\.)(${namePattern})()`,
        `(')(${namePattern})(')`
    ];
};

export const onReaderLoad = (
    event: ProgressEvent<FileReader>,
    templateFile: File
) => {
    // TODO: reduce side-effecting code
    updateImportState('Validating');
    let templateFileRawContent = event.target.result.toString(),
        templateToApply: Spec | TopLevelSpec;
    try {
        templateToApply = JSON.parse(templateFileRawContent);
    } catch (e) {
        updateImportError('Template_Import_Invalid_Json');
        return;
    }
    const ajv = new Ajv({
        format: 'full'
    });
    let provider = determineProviderFromSpec(templateToApply);
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

export const replaceExportTemplatePlaceholders = (
    template: string,
    name: string,
    token: string
) => {
    let replacedTemplate = template;
    getExportFieldTokenPatterns(name).forEach(
        (pattern) =>
            (replacedTemplate = replaceTemplateFieldWithToken(
                replacedTemplate,
                pattern,
                token
            ))
    );
    return replacedTemplate;
};

export const replaceTemplateFieldWithToken = (
    template: string,
    pattern: string,
    token: string
) => template.replace(new RegExp(pattern, 'g'), `$1${token}$3`);

export const resolveExportUserMeta = (): IDenebTemplateMetadata => {
    const i18n = getHostLM(),
        { visual, templates } = getState(),
        visualMetadata = getVisualMetadata(),
        { metadataVersion } = getConfig().templates,
        { templateExportMetadata } = templates;
    return {
        deneb: {
            build: visualMetadata.version,
            metaVersion: metadataVersion,
            provider: <TSpecProvider>visual.settings.vega.provider
        },
        information: {
            name:
                templateExportMetadata.information?.name ||
                i18n.getDisplayName('Template_Export_Information_Name_Empty'),
            description:
                templateExportMetadata.information?.description ||
                i18n.getDisplayName(
                    'Template_Export_Information_Description_Empty'
                ),
            author:
                templateExportMetadata.information?.author ||
                i18n.getDisplayName('Template_Export_Author_Name_Empty'),
            uuid: templateExportMetadata.information?.uuid || uuidv4(),
            generated: new Date().toISOString()
        },
        dataset: templateExportMetadata.dataset.map((d, di) => {
            return {
                key: `__${di}__`,
                name: d.name || d.namePlaceholder,
                description: d.description || '',
                type: d.type,
                kind: d.kind,
                namePlaceholder: d.namePlaceholder
            };
        })
    };
};

export const updateExportError = (i18nKey: string) => {
    getStore().dispatch(
        templateExportError(getHostLM().getDisplayName(i18nKey))
    );
};

export const updateImportError = (
    i18nKey: string,
    errors: ErrorObject[] = []
) => {
    getStore().dispatch(
        templateImportError({
            templateImportErrorMessage: getHostLM().getDisplayName(i18nKey),
            templateSchemaErrors: errors
        })
    );
};

export const updateImportState = (state: TTemplateImportState) => {
    getStore().dispatch(updateTemplateImportState(state));
};

export const updateImportSuccess = (payload: ITemplateImportPayload) => {
    getStore().dispatch(templateImportSuccess(payload));
};
