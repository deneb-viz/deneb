import Ajv from 'ajv';
import ErrorObject = Ajv.ErrorObject;
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

import {
    TDatasetFieldType,
    IDenebTemplateMetadata,
    ITemplateDatasetField
} from '../../schema/template-v1';

import { getConfig, getVisualMetadata } from '../config/public';
import { getHostLM } from '../i18n/public';
import {
    getParsedConfigFromSettings,
    indentJson,
    TSpecProvider
} from '../specification/public';
import { getState } from '../store/public';

import {
    getEscapedReplacerPattern,
    onReaderLoad,
    replaceExportTemplatePlaceholders,
    resolveExportUserMeta,
    updateExportError,
    updateExportState,
    updateImportError,
    updateImportState
} from './private';

export const getExportTemplate = () => {
    const { visual } = getState(),
        { settings, spec } = visual,
        { vega } = settings,
        { providerResources } = getConfig(),
        vSchema = (
            (vega.provider === 'vega' && providerResources.vega) ||
            providerResources.vegaLite
        ).schemaUrl,
        baseObj = {
            $schema: vSchema,
            usermeta: {},
            config: {}
        };
    let usermeta = resolveExportUserMeta(),
        baseSpec = JSON.stringify(spec.spec);
    usermeta.dataset.forEach((ph) => {
        baseSpec = replaceExportTemplatePlaceholders(
            baseSpec,
            ph.namePlaceholder,
            ph.key
        );
        delete ph.namePlaceholder;
    });
    const outSpec = _.merge(
        baseObj,
        { usermeta },
        { config: getParsedConfigFromSettings() },
        JSON.parse(baseSpec)
    );
    return indentJson(outSpec);
};

export const getNewExportTemplateMetadata = (): IDenebTemplateMetadata => {
    const visualMetadata = getVisualMetadata(),
        { metadataVersion } = getConfig().templates;
    return {
        deneb: {
            build: visualMetadata.version,
            metaVersion: metadataVersion,
            provider: null
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

export const getPlaceholderDropdownText = (
    datasetField: ITemplateDatasetField
) => {
    const i18n = getHostLM();
    switch (datasetField.kind) {
        case 'column':
            return i18n.getDisplayName('Dropdown_Placeholder_Column');
        case 'measure':
            return i18n.getDisplayName('Dropdown_Placeholder_Measure');
        default:
            return i18n.getDisplayName('Dropdown_Placeholder_Both');
    }
};

export const getPlaceholderResolutionStatus = (
    template: Spec | TopLevelSpec
) => {
    const usermeta = <IDenebTemplateMetadata>template?.usermeta;
    return (
        !usermeta.dataset ||
        usermeta.dataset?.length === 0 ||
        usermeta.dataset.filter((ph) => !ph.suppliedObjectName).length === 0
    );
};

export const getReplacedTemplate = (template: Spec | TopLevelSpec) => {
    // TODO: reduce side-effecting code
    let templateToApply = { ...template };
    delete templateToApply.$schema;
    delete templateToApply.config;
    delete templateToApply.usermeta;
    let jsonSpec = indentJson(templateToApply);
    (<IDenebTemplateMetadata>template?.usermeta)?.dataset?.forEach((ph) => {
        const pattern = new RegExp(getEscapedReplacerPattern(ph.key), 'g');
        jsonSpec = jsonSpec.replace(pattern, ph.suppliedObjectName);
    });
    return jsonSpec;
};

export const onTemplateFileSelect = (files: FileList) => {
    // TODO: reduce side-effecting code
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

export const resolveTypeIcon = (type: TDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return 'ToggleRight';
        case 'text':
            return 'HalfAlpha';
        case 'numeric':
            return 'NumberSymbol';
        case 'dateTime':
            return 'Calendar';
        default:
            return 'Unknown';
    }
};

export const resolveTypeIconTitle = (type: TDatasetFieldType) => {
    const i18n = getHostLM();
    switch (type) {
        case 'bool':
            return i18n.getDisplayName('Template_Type_Descriptor_Bool');
        case 'text':
            return i18n.getDisplayName('Template_Type_Descriptor_Text');
        case 'numeric':
            return i18n.getDisplayName('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return i18n.getDisplayName('Template_Type_Descriptor_DateTime');
        default:
            return i18n.getDisplayName('Template_Import_Not_Deneb');
    }
};

export const validateSpecificationForExport = () => {
    const { spec } = getState().visual;
    updateExportState('Validating');
    if (spec.status === 'valid') {
        updateExportState('Editing');
    } else {
        updateExportError('Template_Export_Bad_Spec');
    }
};

export interface ITemplateImportErrorPayload {
    templateImportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
}

export interface ITemplateExportFieldUpdatePayload {
    selector: string;
    value: string;
}

export interface ITemplateImportPayload {
    templateFile: File;
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    provider?: TSpecProvider;
}

export type TTemplateExportState =
    | 'None'
    | 'Validating'
    | 'Editing'
    | 'Success'
    | 'Error';

export type TTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';
