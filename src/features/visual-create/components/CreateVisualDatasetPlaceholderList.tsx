import React from 'react';

import { i18nValue } from '../../../core/ui/i18n';
import { Paragraph } from '../../../components/elements/Typography';

export const CreateVisualDatasetPlaceholderList: React.FC = () => {
    return (
        <>
            <Paragraph>{i18nValue('Data_Placeholder_Assistive_PH')}</Paragraph>
        </>
    );
};
