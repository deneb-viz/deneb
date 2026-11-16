import type powerbi from 'powerbi-visuals-api';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { getDenebState } from '@deneb-viz/app-core';

/**
 * Every saved property that comes from a template. Resetting the Template
 * card reverts all of them, which removes the template and its field mapping
 * and returns the visual to its import surface.
 */
export const TEMPLATE_PROPERTIES: powerbi.visuals.FormattingDescriptor[] = [
    { objectName: 'vega', propertyName: 'jsonSpec' },
    { objectName: 'vega', propertyName: 'jsonConfig' },
    { objectName: 'vega', propertyName: 'provider' },
    { objectName: 'vega', propertyName: 'version' },
    {
        objectName: 'stateManagement',
        propertyName: 'supportFieldConfiguration'
    },
    { objectName: 'stateManagement', propertyName: 'denebMetaVersion' },
    {
        objectName: 'stateManagement',
        propertyName: 'consolidateFieldParameters'
    }
];

/**
 * The Template card's only slice: a read-only status line whose reset
 * reverts the template's properties on other objects. The formatting
 * service asks each slice for its own reset descriptors, so this is where
 * the card's reset reach is defined.
 */
class TemplateStatusSlice extends formattingSettings.ReadOnlyText {
    getRevertToDefaultDescriptor(): powerbi.visuals.FormattingDescriptor[] {
        return TEMPLATE_PROPERTIES;
    }
}

/**
 * The format pane's Template card: shows whether a template is applied, and
 * its "Reset to default" removes it. The card description warns that the
 * format pane's "Reset all" removes it too.
 */
export class ViewerTemplateCard extends formattingSettings.SimpleCard {
    name = 'template';
    displayNameKey = 'Objects_Viewer_Template';
    descriptionKey = 'Objects_Viewer_Template_Description';
    status = new TemplateStatusSlice({
        name: 'status',
        displayNameKey: 'Objects_Viewer_Template_Status',
        value: ''
    });
    slices = [this.status];

    /**
     * @param hasTemplate reads whether the saved spec holds a template, which
     *  this card does not hold itself.
     */
    constructor(private readonly hasTemplate: () => boolean) {
        super();
    }

    onPreProcess(): void {
        const { translate } = getDenebState().i18n;
        this.status.value = this.hasTemplate()
            ? translate('PowerBI_Viewer_Template_Applied')
            : translate('PowerBI_Viewer_Template_None');
    }
}
