import React from 'react';

import { getI18nValue } from '../../i18n';
import { Caption1 } from '@fluentui/react-components';

export const CreateVisualDatasetPlaceholderEmpty: React.FC = () => {
    return (
        <p>
            <Caption1>
                {getI18nValue('Data_Placeholder_Assistive_No_PH', [
                    getI18nValue('Button_Create')
                ])}
            </Caption1>
        </p>
    );
};
