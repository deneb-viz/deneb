import React from 'react';

import store from '../../../store';
import { CreateVisualProviderTemplateList } from './CreateVisualProviderTemplateList';
import { CreateVisualImportControl } from './CreateVisualImportControl';

export const CreateVisualTemplateNav: React.FC = () => {
    const { templateProvider } = store((state) => state);
    switch (templateProvider) {
        case 'import':
            return <CreateVisualImportControl />;
        default:
            return <CreateVisualProviderTemplateList />;
    }
};
