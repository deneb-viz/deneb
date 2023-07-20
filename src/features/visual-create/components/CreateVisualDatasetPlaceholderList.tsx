import React from 'react';
import { Caption1 } from '@fluentui/react-components';

import { getI18nValue } from '../../i18n';

export const CreateVisualDatasetPlaceholderList: React.FC = () => {
    return (
        <p>
            <Caption1>{getI18nValue('Data_Placeholder_Assistive_PH')}</Caption1>
        </p>
    );
};
