import { ITemplateSliceState } from '../types';
import templates from '../templates';

import {
    getNewExportTemplateMetadata,
    getPlaceholderResolutionStatus
} from '../api/template';

const templateReducer: ITemplateSliceState = {
    ...{
        allImportCriteriaApplied: getPlaceholderResolutionStatus(
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
        templateExportMetadata: getNewExportTemplateMetadata(),
        selectedTemplateIndex: 0,
        selectedExportOperation: 'information',
        specProvider: 'vegaLite',
        templateProvider: 'vegaLite'
    },
    ...templates
};

export { templateReducer };
