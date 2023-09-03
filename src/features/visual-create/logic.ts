import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';

import { getJsonAsIndentedString } from '../../core/utils/json';
import { TSpecProvider } from '../../core/vega';
import { getState } from '../../store';
import {
    IDenebTemplateMetadata,
    ITemplateInteractivityOptions
} from '../template/schema';
import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import {
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { getReducedPlaceholdersForMetadata } from '../template';
import { logDebug } from '../logging';

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
export const createFromTemplate = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec,
    metadata: IDenebTemplateMetadata
) => {
    logDebug('createFromTemplate', { provider, template });
    const {
        create: { createFromTemplate }
    } = getState();
    const jsonSpec = getReplacedTemplate(template, metadata);
    const jsonConfig = getJsonAsIndentedString(template.config);
    const interactivity = getInteractivityPropsFromTemplate(template);
    logDebug('createFromTemplate', {
        jsonSpec,
        jsonConfig,
        interactivity
    });
    const { renewEditorFieldsInUse } = getState();
    updateObjectProperties(
        resolveObjectProperties([
            {
                objectName: 'vega',
                properties: [
                    ...[
                        { name: 'provider', value: provider },
                        { name: 'jsonSpec', value: jsonSpec },
                        { name: 'jsonConfig', value: jsonConfig },
                        { name: 'isNewDialogOpen', value: false }
                    ],
                    ...resolveInteractivityProps(interactivity)
                ]
            }
        ])
    );
    renewEditorFieldsInUse();
    specEditorService.setText(jsonSpec);
    configEditorService.setText(jsonConfig);
    createFromTemplate();
};

/**
 * For supplied template, ensure that we can obtain interactivity properties
 * from it.
 */
const getInteractivityPropsFromTemplate = (template: Spec | TopLevelSpec) =>
    (<IDenebTemplateMetadata>template?.usermeta)?.interactivity || null;

/**
 * For a supplied template, substitute placeholder values and return a
 * stringified representation of the object.
 */
const getReplacedTemplate = (
    template: Spec | TopLevelSpec,
    metadata: IDenebTemplateMetadata
) => {
    const templateToApply = { ...template };
    delete templateToApply.$schema;
    delete templateToApply.config;
    delete templateToApply.usermeta;
    const { dataset } = metadata;
    const spec = getJsonAsIndentedString(templateToApply);
    return getReducedPlaceholdersForMetadata(dataset, spec);
};

/**
 * If we have resolved interactivity props from the template, create appropriate persistence properties
 */
const resolveInteractivityProps = (
    interactivity: ITemplateInteractivityOptions
): IPersistenceProperty[] =>
    (interactivity && [
        { name: 'enableTooltips', value: interactivity.tooltip },
        { name: 'enableContextMenu', value: interactivity.contextMenu },
        { name: 'enableHighlight', value: interactivity.highlight || false },
        { name: 'enableSelection', value: interactivity.selection },
        { name: 'selectionMaxDataPoints', value: interactivity.dataPointLimit }
    ]) ||
    [];
