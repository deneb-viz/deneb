import React from 'react';
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { useDenebState } from '../../../state';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

export const useTemplatePlaceholderMessageStyles = makeStyles({
    templatePlaceholderMessage: {
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL
    }
});

/**
 * Displays correct message, depending on whether the template has
 * placeholders or not.
 */
export const TemplatePlaceholderMessage = () => {
    const { metadata } = useDenebState(
        (state) => ({
            metadata: state.create.metadata
        }),
        shallow
    );
    const classes = useTemplatePlaceholderMessageStyles();
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
const templateHasPlaceholders = (
    template: UsermetaTemplate | undefined | null
) => (template?.dataset?.length ?? 0) > 0;
