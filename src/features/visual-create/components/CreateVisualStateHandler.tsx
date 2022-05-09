import React from 'react';

import store from '../../../store';
import { CreateVisualImportStatus } from './CreateVisualImportStatus';
import { CreateVisualTemplateInfo } from './CreateVisualTemplateInfo';

export const CreateVisualStateHandler: React.FC = () => {
    const { templateProvider, templateImportState } = store((state) => state);
    switch (true) {
        case templateProvider === 'import' && templateImportState !== 'Success':
            return <CreateVisualImportStatus />;
        default:
            return <CreateVisualTemplateInfo />;
    }
};
