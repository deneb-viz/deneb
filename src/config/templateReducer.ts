import { ITemplateSliceState } from '../types';
import { TemplateService } from '../services/TemplateService';
import templates from '../templates';

const templateService = new TemplateService();

const templateReducer: ITemplateSliceState = {
    ...{
        allImportCriteriaApplied: templateService.getPlaceholderResolutionStatus(
            templates.vegaLite[0]
        ),
        allExportCriteriaApplied: false,
        templateFile: null,
        templateImportState: 'None',
        templateExportState: 'None',
        templateImportErrorMessage: null,
        templateExportErrorMessage: null,
        templateSchemaErrors: [],
        templateFileRawContent: null,
        templateToApply: templates.vegaLite[0],
        templateExportMetadata: templateService.newExportTemplateMetadata(),
        selectedTemplateIndex: 0,
        selectedExportOperation: 'information',
        specProvider: 'vegaLite',
        templateProvider: 'vegaLite'
    },
    ...templates
};

export { templateReducer };
