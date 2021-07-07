import { ITemplateSliceState } from '../api/store';
import templates from '../templates';

const templateReducer: ITemplateSliceState = {
    ...{
        allImportCriteriaApplied: false,
        allExportCriteriaApplied: false,
        templateFile: null,
        templateImportState: 'None',
        templateExportState: 'None',
        templateImportErrorMessage: null,
        templateExportErrorMessage: null,
        templateSchemaErrors: [],
        templateFileRawContent: null,
        templateToApply: templates.vegaLite[0],
        templateExportMetadata: null,
        selectedTemplateIndex: 0,
        selectedExportOperation: 'information',
        specProvider: 'vegaLite',
        templateProvider: 'vegaLite'
    },
    ...templates
};

export { templateReducer };
