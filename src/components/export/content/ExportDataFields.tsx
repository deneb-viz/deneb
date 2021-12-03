import * as React from 'react';

import store from '../../../store';
import Dataset, { getExportColumns } from '../../elements/Dataset';

const ExportDataFields: React.FC = () => {
    const { templateExportMetadata } = store((state) => state);
    return (
        <Dataset
            dataset={templateExportMetadata?.dataset}
            columns={getExportColumns}
        />
    );
};

export default ExportDataFields;
