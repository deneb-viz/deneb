export {
    getExportTemplate,
    getNewExportTemplateMetadata,
    getPlaceholderDropdownText,
    getPlaceholderResolutionStatus,
    getReplacedTemplate,
    onTemplateFileSelect,
    replaceTemplateFieldWithToken,
    resolveTypeIcon,
    resolveTypeIconTitle,
    resolveValueDescriptor,
    resolveVisualMetaToDatasetField,
    validateSpecificationForExport,
    ITemplateImportErrorPayload,
    ITemplateExportFieldUpdatePayload,
    TTemplateExportState,
    TTemplateImportState
};

import powerbi from 'powerbi-visuals-api';
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import * as _ from 'lodash';
import Ajv from 'ajv';
import ErrorObject = Ajv.ErrorObject;
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { v4 as uuidv4 } from 'uuid';
import { specificationService } from '../../services'; // TODO: Needs moving into API (TBD)
import * as schema_v1 from '../../schema/deneb-template-usermeta-v1.json'; // TODO: Needs moving into API (Template)

import {
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    TDatasetFieldType
} from '../../schema/template-v1';
import {
    templateExportError,
    templateImportError,
    templateImportSuccess,
    updateTemplateImportState,
    updateTemplateExportState
} from '../../store/templateReducer';
import { getConfig, getVisualMetadata } from '../config';
import { encodeFieldForSpec } from '../dataView';
import { getHostLM } from '../i18n';
import { getState, getStore } from '../store';
import { ITemplateImportPayload } from '../../types';

const getEscapedReplacerPattern = (value: string) => {
    return value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');
};

const getExportFieldTokenPatterns = (name: string) => {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        `(")(${namePattern})(")`,
        `(\\\.)(${namePattern})()`,
        `(')(${namePattern})(')`
    ];
};

const getExportTemplate = () => {
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
        { config: specificationService.getParsedConfigFromSettings() },
        JSON.parse(baseSpec)
    );
    return specificationService.indentJson(outSpec);
};

const getNewExportTemplateMetadata = (): IDenebTemplateMetadata => {
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

const getPlaceholderDropdownText = (datasetField: ITemplateDatasetField) => {
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

const getPlaceholderResolutionStatus = (template: Spec | TopLevelSpec) => {
    const usermeta = <IDenebTemplateMetadata>template?.usermeta;
    return (
        !usermeta.dataset ||
        usermeta.dataset?.length === 0 ||
        usermeta.dataset.filter((ph) => !ph.suppliedObjectName).length === 0
    );
};

const getReplacedTemplate = (template: Spec | TopLevelSpec) => {
    // TODO: reduce side-effecting code
    let templateToApply = { ...template };
    delete templateToApply.$schema;
    delete templateToApply.config;
    delete templateToApply.usermeta;
    let jsonSpec = specificationService.indentJson(templateToApply);
    (<IDenebTemplateMetadata>template?.usermeta)?.dataset?.forEach((ph) => {
        const pattern = new RegExp(getEscapedReplacerPattern(ph.key), 'g');
        jsonSpec = jsonSpec.replace(pattern, ph.suppliedObjectName);
    });
    return jsonSpec;
};

const onReaderLoad = (event: ProgressEvent<FileReader>, templateFile: File) => {
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
    let provider = specificationService.determineProviderFromSpec(
        templateToApply
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

const onTemplateFileSelect = (files: FileList) => {
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

const replaceExportTemplatePlaceholders = (
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

const replaceTemplateFieldWithToken = (
    template: string,
    pattern: string,
    token: string
) => template.replace(new RegExp(pattern, 'g'), `$1${token}$3`);

const resolveExportUserMeta = (): IDenebTemplateMetadata => {
    const i18n = getHostLM(),
        { visual, templates } = getState(),
        visualMetadata = getVisualMetadata(),
        { metadataVersion } = getConfig().templates,
        { templateExportMetadata } = templates;
    return {
        deneb: {
            build: visualMetadata.version,
            metaVersion: metadataVersion,
            provider: visual.settings.vega.provider
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

const resolveTypeIcon = (type: TDatasetFieldType) => {
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

const resolveTypeIconTitle = (type: TDatasetFieldType) => {
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

const resolveValueDescriptor = (
    type: ValueTypeDescriptor
): TDatasetFieldType => {
    switch (true) {
        case type.bool:
            return 'bool';
        case type.text:
            return 'text';
        case type.numeric:
            return 'numeric';
        case type.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};

const resolveVisualMetaToDatasetField = (
    metadata: DataViewMetadataColumn
): ITemplateDatasetField => {
    const encodedName = encodeFieldForSpec(metadata.displayName);
    return {
        key: metadata.queryName,
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: resolveValueDescriptor(metadata.type)
    };
};

const updateExportError = (i18nKey: string) =>
    getStore().dispatch(
        templateExportError(getHostLM().getDisplayName(i18nKey))
    );

const updateExportState = (state: TTemplateExportState) =>
    getStore().dispatch(updateTemplateExportState(state));

const updateImportState = (state: TTemplateImportState) =>
    getStore().dispatch(updateTemplateImportState(state));

const updateImportError = (i18nKey: string, errors: ErrorObject[] = []) =>
    getStore().dispatch(
        templateImportError({
            templateImportErrorMessage: getHostLM().getDisplayName(i18nKey),
            templateSchemaErrors: errors
        })
    );

const updateImportSuccess = (payload: ITemplateImportPayload) => {
    getStore().dispatch(templateImportSuccess(payload));
};

const validateSpecificationForExport = () => {
    const { spec } = getState().visual;
    updateExportState('Validating');
    if (spec.status === 'valid') {
        updateExportState('Editing');
    } else {
        updateExportError('Template_Export_Bad_Spec');
    }
};

interface ITemplateImportErrorPayload {
    templateImportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
}

interface ITemplateExportFieldUpdatePayload {
    selector: string;
    value: string;
}

type TTemplateExportState =
    | 'None'
    | 'Validating'
    | 'Editing'
    | 'Success'
    | 'Error';

type TTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';
