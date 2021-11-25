import * as React from 'react';

import store from '../../../store';
import ImportTemplateStatus from '../../status/ImportTemplateStatus';
import TemplateInfo from './TemplateInfo';

const TemplateStateHandler: React.FC = () => {
    const { templateProvider, templateImportState } = store((state) => state);
    switch (true) {
        case templateProvider === 'import' && templateImportState !== 'Success':
            return <ImportTemplateStatus />;
        default:
            return <TemplateInfo />;
    }
};

export default TemplateStateHandler;
