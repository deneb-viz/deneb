import React from 'react';
import { Caption1 } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { useCreateStyles } from './';
import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { UsermetaTemplate } from '@deneb-viz/core-dependencies';

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

/**
 * Confirms that the supplied template metadata contains dataset entries, and
 * that placeholders are needed to populate them.
 */
const templateHasPlaceholders = (template: UsermetaTemplate) =>
    template?.dataset?.length > 0;
