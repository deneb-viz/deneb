import React from 'react';
import { Body1 } from '@fluentui/react-components';

import { useCreateStyles } from './';
import { getI18nValue } from '../../i18n';

export const NoTemplateMessage: React.FC = () => {
    const classes = useCreateStyles();
    return (
        <div className={classes.noTemplateMessage}>
            <Body1>{getI18nValue('Text_No_Template_Selected')}</Body1>
        </div>
    );
};
