import React from 'react';
import { Button } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { logDebug, logRender } from '../../logging';
import { createFromTemplate } from '../logic';
import { useJsonEditorContext } from '../../json-editor';

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
    const { spec, config } = useJsonEditorContext();
    const onCreate = () => {
        logDebug('Creating from template...');
        createFromTemplate(
            metadata,
            candidates,
            spec?.current.editor,
            config?.current.editor
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
