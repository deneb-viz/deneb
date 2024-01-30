import { getState } from '../../store';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { logDebug } from '../logging';
import { IAceEditor } from 'react-ace/lib/types';
import {
    IDenebTemplateAllocationComponents,
    UsermetaTemplate
} from '@deneb-viz/core-dependencies';
import { getTemplateReplacedForDataset } from '@deneb-viz/template';

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
export const createFromTemplate = (
    metadata: UsermetaTemplate,
    candidates: IDenebTemplateAllocationComponents,
    specEditor: IAceEditor,
    configEditor: IAceEditor
) => {
    logDebug('createFromTemplate', { metadata, candidates });
    const {
        create: { createFromTemplate }
    } = getState();
    const jsonSpec = getTemplateReplacedForDataset(
        candidates.spec,
        metadata.dataset
    );
    const jsonConfig = candidates.config;
    logDebug('createFromTemplate - processed candidates', {
        jsonSpec,
        jsonConfig
    });
    const { renewEditorFieldsInUse } = getState();
    updateObjectProperties(
        resolveObjectProperties([
            {
                objectName: 'vega',
                properties: [
                    { name: 'provider', value: metadata.deneb.provider },
                    { name: 'jsonSpec', value: jsonSpec },
                    { name: 'jsonConfig', value: jsonConfig },
                    { name: 'isNewDialogOpen', value: false },
                    {
                        name: 'enableTooltips',
                        value: metadata.interactivity?.tooltip || false
                    },
                    {
                        name: 'enableContextMenu',
                        value: metadata.interactivity?.contextMenu || false
                    },
                    {
                        name: 'enableHighlight',
                        value: metadata.interactivity?.highlight || false
                    },
                    {
                        name: 'enableSelection',
                        value: metadata.interactivity?.selection || false
                    },
                    {
                        name: 'selectionMaxDataPoints',
                        value: metadata.interactivity?.dataPointLimit || 0
                    }
                ]
            }
        ])
    );
    renewEditorFieldsInUse(specEditor);
    specEditor.setValue(jsonSpec);
    specEditor.moveCursorToPosition({ row: 0, column: 0 });
    configEditor.setValue(jsonConfig);
    configEditor.moveCursorToPosition({ row: 0, column: 0 });
    specEditor.focus();
    createFromTemplate();
};
