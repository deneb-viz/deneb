import React from 'react';
import { IColumn } from '@fluentui/react/lib/DetailsList';

import { DATASET_NAME } from '../../../constants';
import store from '../../../store';
import { Dataset, getTemplateDatasetTypeColumn } from '../../template';
import { getI18nValue } from '../../i18n';

const getExportNameColumn = (): IColumn => ({
    key: 'export_name',
    name: getI18nValue('Template_Export_Dataset_Field_Name'),
    fieldName: 'name',
    minWidth: 150,
    maxWidth: 250
});

const getExportDescriptionColumn = (): IColumn => ({
    key: 'export_description',
    name: getI18nValue('Template_Export_Dataset_Field_Description'),
    fieldName: 'description',
    minWidth: 350,
    flexGrow: 1
});

const getExportColumns = (): IColumn[] => [
    getTemplateDatasetTypeColumn(),
    getExportNameColumn(),
    getExportDescriptionColumn()
];

export const ExportVisualDataFields: React.FC = () => {
    const { templateExportMetadata } = store((state) => state);
    return (
        <Dataset
            dataset={templateExportMetadata?.[DATASET_NAME]}
            columns={getExportColumns}
        />
    );
};
