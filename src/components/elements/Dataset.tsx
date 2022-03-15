import * as React from 'react';

import {
    DetailsList,
    DetailsRow,
    DetailsListLayoutMode,
    IColumn,
    SelectionMode,
    IDetailsListProps,
    IDetailsRowStyles
} from '@fluentui/react/lib/DetailsList';

import { ITemplateDatasetField } from '../../core/template/schema';
import DataTypeIcon from './DataTypeIcon';
import CappedTextField from './CappedTextField';
import { getDataset } from '../../core/data/dataset';
import {
    getDatasetFieldByTemplateKey,
    getDatasetTemplateFields
} from '../../core/data/fields';
import { i18nValue } from '../../core/ui/i18n';
import DataFieldLabel from './DataFieldLabel';
import DatasetFieldAssignmentDropdown from './DatasetFieldAssignmentDropdown';
import { TModalDialogType } from '../../core/ui/modal';
import { getState } from '../../store';
import { datasetFieldProps } from '../../core/template';

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

export const getMapColumns = (): IColumn[] => [
    getTypeColumn(),
    getMapNameOriginalColumn(),
    getMapFieldAssignmentColumn()
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

const getMapNameOriginalColumn = (): IColumn => ({
    key: 'name',
    name: i18nValue('Map_Fields_Dataset_Original_Name'),
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

const getMapFieldAssignmentColumn = (): IColumn => ({
    key: 'map_field_assignment',
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

const getAssignmentField = (
    item: ITemplateDatasetField,
    type: TModalDialogType,
    dataset: ITemplateDatasetField[]
) => (
    <DatasetFieldAssignmentDropdown
        datasetField={item}
        dialogType={type}
        dataset={dataset}
    />
);

const getExportNameField = (item: ITemplateDatasetField, index: number) => (
    <CappedTextField
        id={`dataset[${index}].name`}
        i18nLabel={`${item.name}`}
        i18nPlaceholder={`${item?.namePlaceholder}`}
        maxLength={datasetFieldProps.name.maxLength}
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
        maxLength={datasetFieldProps.description.maxLength}
        multiline
        inline
    />
);

const renderDatasetItem = (
    item: ITemplateDatasetField,
    index: number,
    column: IColumn
) => {
    const displayName =
        getDatasetFieldByTemplateKey(item.key)?.displayName || '';
    const { editorFieldsInUse } = getState();
    switch (column.key) {
        case 'type':
            return getDataTypeIcon(item);
        case 'name':
            return getNameField(item);
        case 'field_assignment':
            return getAssignmentField(
                item,
                'new',
                getDatasetTemplateFields(getDataset().fields)
            );
        case 'map_field_assignment':
            return getAssignmentField(
                item,
                'mapping',
                getDatasetTemplateFields(editorFieldsInUse)
            );
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
