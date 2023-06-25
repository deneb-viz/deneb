import React from 'react';

import { Paragraph } from '../../../components/elements/Typography';
import { getI18nValue } from '../../i18n';

export const CreateVisualDatasetPlaceholderEmpty: React.FC = () => {
    return (
        <Paragraph>
            {getI18nValue('Data_Placeholder_Assistive_No_PH', [
                getI18nValue('Button_Create')
            ])}
        </Paragraph>
    );
};
