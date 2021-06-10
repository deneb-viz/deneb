import powerbi from 'powerbi-visuals-api';
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

import Ajv from 'ajv';
import { v4 as uuidv4 } from 'uuid';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';

import Debugger, { standardLog } from '../Debugger';
import { ITemplateService } from '../types';
import store from '../store';
import {
    templateExportError,
    templateImportError,
    templateImportSuccess,
    updateTemplateImportState,
    updateTemplateExportState
} from '../store/templateReducer';
import { specificationService } from '.';
import * as schema_v1 from '../schema/deneb-template-usermeta-v1.json';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    TDatasetFieldType
} from '../schema/template-v1';
import * as _ from 'lodash';
import { metaVersion } from '../config';
import * as api from '../api';
import getConfig = api.config.getConfig;
import getVisualMetadata = api.config.getVisualMetadata;

const owner = 'TemplateService';

export class TemplateService implements ITemplateService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    newExportTemplateMetadata(): IDenebTemplateMetadata {
        const visualMetadata = getVisualMetadata();
        return {
            deneb: {
                build: visualMetadata.version,
                metaVersion,
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
    }

    @standardLog()
    getExportTemplate() {
        Debugger.log('Compiling template for export...');
        const { visual } = store.getState(),
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
        let usermeta = this.resolveExportUserMeta(),
            baseSpec = JSON.stringify(spec.spec);
        usermeta.dataset.forEach((ph) => {
            baseSpec = api.template.replaceExportTemplatePlaceholders(
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
    }

    @standardLog()
    getReplacedTemplate(template: Spec | TopLevelSpec) {
        Debugger.log('Cleaning-out unnecessary properties...');
        let templateToApply = { ...template };
        delete templateToApply.$schema;
        delete templateToApply.config;
        delete templateToApply.usermeta;
        Debugger.log('Getting indented representation of spec...');
        let jsonSpec = specificationService.indentJson(templateToApply);
        Debugger.log('Processing placeholders...');
        (<IDenebTemplateMetadata>template?.usermeta)?.dataset?.forEach((ph) => {
            const pattern = new RegExp(
                api.template.getEscapedReplacerPattern(ph.key),
                'g'
            );
            jsonSpec = jsonSpec.replace(pattern, ph.suppliedObjectName);
        });
        Debugger.log('Processed template', jsonSpec);
        return jsonSpec;
    }

    @standardLog()
    getPlaceholderResolutionStatus(template: Spec | TopLevelSpec) {
        const usermeta = <IDenebTemplateMetadata>template?.usermeta;
        return (
            !usermeta.dataset ||
            usermeta.dataset?.length === 0 ||
            usermeta.dataset.filter((ph) => !ph.suppliedObjectName).length === 0
        );
    }

    @standardLog()
    getPlaceholderDropdownText(datasetField: ITemplateDatasetField) {
        const { i18n } = store.getState().visual;
        switch (datasetField.kind) {
            case 'column':
                return i18n.getDisplayName('Dropdown_Placeholder_Column');
            case 'measure':
                return i18n.getDisplayName('Dropdown_Placeholder_Measure');
            default:
                return i18n.getDisplayName('Dropdown_Placeholder_Both');
        }
    }

    @standardLog()
    resolveTypeIcon(type: TDatasetFieldType) {
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
    }

    @standardLog()
    resolveTypeIconTitle(type: TDatasetFieldType) {
        const { i18n } = store.getState().visual;
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
    }

    @standardLog()
    resolveValueDescriptor(type: ValueTypeDescriptor): TDatasetFieldType {
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
    }

    @standardLog()
    resolveVisualMetaToDatasetField(
        metadata: DataViewMetadataColumn
    ): ITemplateDatasetField {
        const encodedName = api.dataView.encodeFieldForSpec(
            metadata.displayName
        );
        return {
            key: metadata.queryName,
            name: encodedName,
            namePlaceholder: encodedName,
            description: '',
            kind: (metadata.isMeasure && 'measure') || 'column',
            type: this.resolveValueDescriptor(metadata.type)
        };
    }

    @standardLog()
    handleFileSelect(files: FileList) {
        Debugger.log('Template file supplied.');
        const { i18n } = store.getState().visual;
        store.dispatch(updateTemplateImportState('Supplied'));
        const reader = new FileReader();
        if (files?.length === 1 && files[0]?.type === 'application/json') {
            Debugger.log('Template file is valid. Loading...');
            store.dispatch(updateTemplateImportState('Loading'));
            const file = files[0];
            reader.onload = (e) => this.onReaderLoad(e, file);
            reader.readAsText(file);
        } else {
            Debugger.log('Template not viable.');
            store.dispatch(
                templateImportError({
                    templateImportErrorMessage: i18n.getDisplayName(
                        'Template_Import_Incorrect_Type'
                    ),
                    templateSchemaErrors: []
                })
            );
        }
    }

    @standardLog()
    validateSpecificationForExport() {
        Debugger.log('Confirming spec is valid before proceeding...');
        const { i18n, spec } = store.getState().visual;
        store.dispatch(updateTemplateExportState('Validating'));
        if (spec.status === 'valid') {
            store.dispatch(updateTemplateExportState('Editing'));
        } else {
            store.dispatch(
                templateExportError(
                    i18n.getDisplayName('Template_Export_Bad_Spec')
                )
            );
        }
    }

    /**
     * Generates a suitable `usermeta` object for the current `templateReducer` state
     * and provides suitable defaults if they are missing, so that generated export
     * templates make sense (as much as possible).
     *
     * @returns suitable `IDenebTemplateMetadata` for the spec
     */
    private resolveExportUserMeta(): IDenebTemplateMetadata {
        Debugger.log('Resolving user metadata for spec...');
        const { visual, templates } = store.getState(),
            { i18n } = visual,
            visualMetadata = getVisualMetadata(),
            { templateExportMetadata } = templates;
        return {
            deneb: {
                build: visualMetadata.version,
                metaVersion,
                provider: visual.settings.vega.provider
            },
            information: {
                name:
                    templateExportMetadata.information?.name ||
                    i18n.getDisplayName(
                        'Template_Export_Information_Name_Empty'
                    ),
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
    }

    /**
     * When a template JSON file is selected for import, this defines the logic for reading the file
     * and parsing it to ensure that it is both valid JSON, and also contains the necessary metadata
     * to provide data role substitution to the end-user. This will dispatch the necessary state to
     * the store for further action as required.
     *
     * @param e - the current event
     * @param templateFile - the selected file for import, to read and parse
     */
    @standardLog()
    private onReaderLoad(e: ProgressEvent<FileReader>, templateFile: File) {
        Debugger.log('Loaded template. Validating...');
        const { i18n } = store.getState().visual;
        store.dispatch(updateTemplateImportState('Validating'));
        let templateFileRawContent = e.target.result.toString(),
            templateToApply: Spec | TopLevelSpec;
        try {
            Debugger.log('Converting file data to object...');
            templateToApply = JSON.parse(templateFileRawContent);
        } catch (e) {
            Debugger.log("❌ Couldn't parse data to JSON! Raising error...");
            store.dispatch(
                templateImportError({
                    templateImportErrorMessage: i18n.getDisplayName(
                        'Template_Import_Invalid_Json'
                    ),
                    templateSchemaErrors: []
                })
            );
            return;
        }
        Debugger.log('✅ JSON is valid! Instantiating validator...');
        const ajv = new Ajv({
            format: 'full'
        });
        Debugger.log('Working out provider...');
        let provider = specificationService.determineProviderFromSpec(
            templateToApply
        );
        Debugger.log('Performing schema validation for usermeta...');
        if (ajv.validate(schema_v1, templateToApply?.usermeta)) {
            Debugger.log('✅ Template validates against schema.');
            store.dispatch(
                templateImportSuccess({
                    templateFile,
                    templateFileRawContent,
                    templateToApply,
                    provider
                })
            );
        } else {
            Debugger.log(
                '❌ Template schema validation failed! Raising error...'
            );
            store.dispatch(
                templateImportError({
                    templateImportErrorMessage: i18n.getDisplayName(
                        'Template_Import_Not_Deneb'
                    ),
                    templateSchemaErrors: ajv.errors
                })
            );
        }
    }
}
