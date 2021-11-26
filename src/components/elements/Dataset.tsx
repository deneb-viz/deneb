import * as React from 'react';

import {
    DetailsList,
    DetailsRow,
    DetailsListLayoutMode,
    IColumn,
    SelectionMode,
    IDetailsHeaderProps,
    IDetailsListProps,
    IDetailsRowStyles
} from '@fluentui/react/lib/DetailsList';

import { ITemplateDatasetField } from '../../core/template/schema';
import DataTypeIcon from './DataTypeIcon';
import CappedTextField from './CappedTextField';
import { lookupMetadataColumn } from '../../core/data/dataset';
import { exportFieldConstraints } from '../../config';
import { i18nValue } from '../../core/ui/i18n';
import DataFieldLabel from './DataFieldLabel';
import DatasetFieldAssignmentDropdown from './DatasetFieldAssignmentDropdown';

export const getExportColumns = (): IColumn[] => [
    getTypeColumn(),
    getExportNameColumn(),
    getExportDescriptionColumn()
];

export const getImportColumns = (): IColumn[] => [
    getTypeColumn(),
    getNameColumn(),
    getFieldAssignmentColumn()
];

const getTypeColumn = (): IColumn => ({
    key: 'type',
    name: '',
    fieldName: 'type',
    minWidth: 15,
    maxWidth: 15
});

const getNameColumn = (): IColumn => ({
    key: 'name',
    name: i18nValue('Template_Dataset_Field_Name'),
    fieldName: 'name',
    minWidth: 150,
    maxWidth: 250
});

const getFieldAssignmentColumn = (): IColumn => ({
    key: 'field_assignment',
    name: i18nValue('Template_Dataset_Field_Assignment'),
    fieldName: 'assignment',
    minWidth: 300
});

const getExportNameColumn = (): IColumn => ({
    key: 'export_name',
    name: i18nValue('Template_Export_Dataset_Field_Name'),
    fieldName: 'name',
    minWidth: 150,
    maxWidth: 250
});

const getExportDescriptionColumn = (): IColumn => ({
    key: 'export_description',
    name: i18nValue('Template_Export_Dataset_Field_Description'),
    fieldName: 'description',
    minWidth: 350,
    flexGrow: 1
});

const getDataTypeIcon = (item: ITemplateDatasetField) => (
    <DataTypeIcon datasetField={item} />
);

const getNameField = (item: ITemplateDatasetField) => (
    <DataFieldLabel datasetField={item} />
);

const getAssignmentField = (item: ITemplateDatasetField) => (
    <DatasetFieldAssignmentDropdown datasetField={item} />
);

const getExportNameField = (item: ITemplateDatasetField, index: number) => (
    <CappedTextField
        id={`dataset[${index}].name`}
        i18nLabel={`${item.name}`}
        i18nPlaceholder={`${item?.namePlaceholder}`}
        maxLength={exportFieldConstraints?.dataset?.name?.maxLength}
        inline
        description={`${i18nValue(
            `Template_Export_Kind_${item?.kind || 'None'}`
        )} ${item?.namePlaceholder}`}
    />
);

const getExportDescriptionField = (index: number) => (
    <CappedTextField
        id={`dataset[${index}].description`}
        i18nLabel='Field Description'
        i18nPlaceholder='Template_Description_Optional_Placeholder'
        maxLength={exportFieldConstraints?.dataset?.description?.maxLength}
        multiline
        inline
    />
);

const renderDatasetHeader = (headerProps: IDetailsHeaderProps, defaultRender) =>
    defaultRender({
        ...headerProps
    });

const renderDatasetItem = (
    item: ITemplateDatasetField,
    index: number,
    column: IColumn
) => {
    const displayName = lookupMetadataColumn(item.key)?.displayName || '';
    switch (column.key) {
        case 'type':
            return getDataTypeIcon(item);
        case 'name':
            return getNameField(item);
        case 'field_assignment':
            return getAssignmentField(item);
        case 'export_name':
            return getExportNameField(item, index);
        case 'export_description':
            return getExportDescriptionField(index);
        default:
            return <span>{displayName}</span>;
    }
};

const renderDatasetRow: IDetailsListProps['onRenderRow'] = (props) => {
    const rowStyles: Partial<IDetailsRowStyles> = {
        cell: { paddingTop: 5, paddingBottom: 5 }
    };
    return <DetailsRow {...props} styles={rowStyles} />;
};

interface IDatasetProps {
    dataset: ITemplateDatasetField[];
    columns: () => IColumn[];
}

export const Dataset: React.FC<IDatasetProps> = ({ dataset, columns }) => {
    const key = dataset?.length || 0;
    return (
        <DetailsList
            key={key}
            columns={columns()}
            items={dataset}
            layoutMode={DetailsListLayoutMode.justified}
            selectionMode={SelectionMode.none}
            onRenderRow={renderDatasetRow}
            onRenderItemColumn={renderDatasetItem}
        />
    );
};

export default Dataset;
