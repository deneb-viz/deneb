import * as React from 'react';

import store from '../../../store';
import ProviderTemplateList from './ProviderTemplateList';
import TemplateImportControl from './TemplateImportControl';

const CreateVisualTemplateNav: React.FC = () => {
    const { templateProvider } = store((state) => state);
    switch (templateProvider) {
        case 'import':
            return <TemplateImportControl />;
        default:
            return <ProviderTemplateList />;
    }
};

export default CreateVisualTemplateNav;
