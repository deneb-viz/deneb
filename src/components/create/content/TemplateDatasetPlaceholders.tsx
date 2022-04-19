import * as React from 'react';

import store from '../../../store';
import TemplateDatasetPlaceholdersEmpty from './TemplateDatasetPlaceholdersEmpty';
import TemplateDatasetPlaceholdersList from './TemplateDatasetPlaceholdersList';
import { IDenebTemplateMetadata } from '../../../core/template/schema';
import { DATASET_NAME } from '../../../constants';

const TemplateDatasetPlaceholders: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    switch (true) {
        case usermeta?.[DATASET_NAME]?.length || 0 === 0:
            return <TemplateDatasetPlaceholdersEmpty />;
        default:
            return <TemplateDatasetPlaceholdersList />;
    }
};

export default TemplateDatasetPlaceholders;
