import powerbi from 'powerbi-visuals-api';
import VisualDataRoleKind = powerbi.VisualDataRoleKind;

import Debugger, { standardLog } from '../Debugger';
import {
    ISpecDataPlaceholder,
    ITemplateBase,
    ITemplateService,
    IVegaLiteTemplate,
    IVegaTemplate
} from '../types';
import store from '../store';
import { specificationService } from '.';

const owner = 'TemplateService';

export class TemplateService implements ITemplateService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    getReplacedTemplate(template: IVegaTemplate | IVegaLiteTemplate) {
        Debugger.log('Getting indented representation of spec...');
        let jsonSpec = specificationService.indentJson(template.spec);
        Debugger.log('Processing placeholders...');
        template.placeholders?.forEach((ph) => {
            const pattern = new RegExp(
                ph.key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                'g'
            ); // [DEBT] this'll be handy to abstract out
            jsonSpec = jsonSpec.replace(pattern, ph.suppliedObjectName);
        });
        Debugger.log('Processed template', jsonSpec);
        return jsonSpec;
    }

    @standardLog()
    getPlaceholderResolutionStatus(template: ITemplateBase) {
        return (
            !template.placeholders ||
            template.placeholders?.length === 0 ||
            template.placeholders.filter((ph) => !ph.suppliedObjectName)
                .length === 0
        );
    }

    @standardLog()
    getPlaceholderDropdownText(placeholder: ISpecDataPlaceholder) {
        const { i18n } = store.getState().visual;
        switch (placeholder.allowKind) {
            case VisualDataRoleKind.Grouping:
                return i18n.getDisplayName('Dropdown_Placeholder_Column');
            case VisualDataRoleKind.Measure:
                return i18n.getDisplayName('Dropdown_Placeholder_Measure');
            default:
                return i18n.getDisplayName('Dropdown_Placeholder_Both');
        }
    }
}
