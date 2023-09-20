import React from 'react';
import { Caption1 } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { useCreateStyles } from './';
import store from '../../../store';
import { templateHasPlaceholders } from '../../template';
import { getI18nValue } from '../../i18n';

/**
 * Displays correct message, depending on whether the template has
 * placeholders or not.
 */
export const TemplatePlaceholderMessage: React.FC = () => {
    const { metadata } = store(
        (state) => ({
            metadata: state.create.metadata
        }),
        shallow
    );
    const classes = useCreateStyles();
    const hasPlaceholders = templateHasPlaceholders(metadata);
    const message = getI18nValue(
        hasPlaceholders
            ? 'Text_Create_Placeholders'
            : 'Text_Create_No_Placeholders',
        [getI18nValue('Text_Button_Create')]
    );
    return (
        <div className={classes.templatePlaceholderMessage}>
            <Caption1 italic>{message}</Caption1>
        </div>
    );
};
