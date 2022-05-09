import React from 'react';

import store from '../../../store';
import { CreateVisualDatasetPlaceholderEmpty } from './CreateVisualDatasetPlaceholderEmpty';
import { CreateVisualDatasetPlaceholderList } from './CreateVisualDatasetPlaceholderList';
import { IDenebTemplateMetadata } from '../../template';
import { DATASET_NAME } from '../../../constants';

export const CreateVisualDatasetPlaceholders: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    switch (true) {
        case usermeta?.[DATASET_NAME]?.length || 0 === 0:
            return <CreateVisualDatasetPlaceholderEmpty />;
        default:
            return <CreateVisualDatasetPlaceholderList />;
    }
};
