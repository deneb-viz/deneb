import React from 'react';
import { DATASET_NAME } from '../../../constants';

import store from '../../../store';
import Dataset, {
    getExportColumns
} from '../../../components/elements/Dataset';

export const ExportVisualDataFields: React.FC = () => {
    const { templateExportMetadata } = store((state) => state);
    return (
        <Dataset
            dataset={templateExportMetadata?.[DATASET_NAME]}
            columns={getExportColumns}
        />
    );
};
