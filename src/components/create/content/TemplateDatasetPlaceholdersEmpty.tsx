import * as React from 'react';

import { i18nValue } from '../../../core/ui/i18n';
import { Paragraph } from '../../elements/Typography';

const TemplateDatasetPlaceholdersEmpty: React.FC = () => {
    return (
        <Paragraph>
            {i18nValue('Data_Placeholder_Assistive_No_PH', ['Button_Create'])}
        </Paragraph>
    );
};

export default TemplateDatasetPlaceholdersEmpty;
