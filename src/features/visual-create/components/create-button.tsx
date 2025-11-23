import React from 'react';
import { Button } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';
import { monaco, useSpecificationEditor } from '@deneb-viz/app-core';

import store, { getState } from '../../../store';
import { getTemplateReplacedForDataset } from '@deneb-viz/json-processing';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../../../core/utils/properties';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type DenebTemplateAllocationComponents } from '@deneb-viz/json-processing/template-processing';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateButton: React.FC = () => {
    const { candidates, metadata, metadataAllDependenciesAssigned } = store(
        (state) => ({
            candidates: state.create.candidates,
            metadata: state.create.metadata,
            metadataAllDependenciesAssigned:
                state.create.metadataAllDependenciesAssigned
        }),
        shallow
    );
    const { spec, config } = useSpecificationEditor();
    const onCreate = () => {
        logDebug('Creating from template...');
        handleCreateFromTemplate(
            metadata,
            candidates,
            spec?.current,
            config?.current
        );
    };
    logRender('CreateButton');
    return (
        <Button
            disabled={!metadataAllDependenciesAssigned}
            appearance='primary'
            onClick={onCreate}
        >
            {getI18nValue('Button_Create')}
        </Button>
    );
};

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
const handleCreateFromTemplate = (
    metadata: UsermetaTemplate,
    candidates: DenebTemplateAllocationComponents,
    specEditor: monaco.editor.IStandaloneCodeEditor,
    configEditor: monaco.editor.IStandaloneCodeEditor
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
    specEditor.setValue(jsonSpec);
    configEditor.setValue(jsonConfig);
    specEditor.focus();
    createFromTemplate();
};
