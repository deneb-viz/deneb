import { ITemplateSliceState } from '../types';
import { TemplateService } from '../services/TemplateService';
import templates from '../templates';

const templateReducer: ITemplateSliceState = {
    ...{
        allPlaceholdersSupplied: new TemplateService().getPlaceholderResolutionStatus(
            templates.vegaLite[0]
        ),
        templateToApply: templates.vegaLite[0],
        selectedTemplateIndex: 0,
        selectedProvider: 'vegaLite'
    },
    ...templates
};

export { templateReducer };
