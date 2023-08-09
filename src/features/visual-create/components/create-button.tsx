import React from 'react';
import { Button } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { logDebug, logRender } from '../../logging';
import { createFromTemplate } from '../logic';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateButton: React.FC = () => {
    const {
        metadata,
        metadataAllDependenciesAssigned,
        provider,
        specification
    } = store(
        (state) => ({
            metadata: state.create.metadata,
            metadataAllDependenciesAssigned:
                state.create.metadataAllDependenciesAssigned,
            provider: state.create.provider,
            specification: state.create.specification
        }),
        shallow
    );
    const onCreate = () => {
        logDebug('Creating from template...');
        createFromTemplate(provider, specification, metadata);
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
