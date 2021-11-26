import * as React from 'react';

import store from '../../../store';
import { IDenebTemplateMetadata } from '../../../core/template/schema';
import { i18nValue } from '../../../core/ui/i18n';
import { Paragraph } from '../../elements/Typography';
import Dataset, { getImportColumns } from '../../elements/Dataset';

const TemplateDatasetPlaceholdersList: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    return (
        <>
            <Paragraph>{i18nValue('Data_Placeholder_Assistive_PH')}</Paragraph>
            <Dataset dataset={usermeta?.dataset} columns={getImportColumns} />
        </>
    );
};

export default TemplateDatasetPlaceholdersList;
