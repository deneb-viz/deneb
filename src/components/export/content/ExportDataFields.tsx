import * as React from 'react';
import { DATASET_NAME } from '../../../core/constants';

import store from '../../../store';
import Dataset, { getExportColumns } from '../../elements/Dataset';

const ExportDataFields: React.FC = () => {
    const { templateExportMetadata } = store((state) => state);
    return (
        <Dataset
            dataset={templateExportMetadata?.[DATASET_NAME]}
            columns={getExportColumns}
        />
    );
};

export default ExportDataFields;
