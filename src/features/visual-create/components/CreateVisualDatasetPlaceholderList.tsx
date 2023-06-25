import React from 'react';

import { Paragraph } from '../../../components/elements/Typography';
import { getI18nValue } from '../../i18n';

export const CreateVisualDatasetPlaceholderList: React.FC = () => {
    return (
        <>
            <Paragraph>
                {getI18nValue('Data_Placeholder_Assistive_PH')}
            </Paragraph>
        </>
    );
};
