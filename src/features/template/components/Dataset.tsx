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

import { ITemplateDatasetField } from '..';
import DataTypeIcon from '../../../components/elements/DataTypeIcon';
import CappedTextField from '../../../components/elements/CappedTextField';
import { getDataset } from '../../../core/data/dataset';
import {
    getDatasetFieldByTemplateKey,
    getDatasetTemplateFields
} from '../../../core/data/fields';
import DatasetFieldAssignmentDropdown from './DatasetFieldAssignmentDropdown';
import { TModalDialogType } from '../../modal-dialog';
import { getState } from '../../../store';
import { DATASET_NAME } from '../../../constants';
import { TEMPLATE_DATASET_FIELD_PROPS } from '../fields';
import { getI18nValue } from '../../i18n';

const getDataTypeIcon = (item: ITemplateDatasetField) => (
    <DataTypeIcon datasetField={item} />
);

const getNameField = (item: ITemplateDatasetField) => (
    <Caption1>{item.name}</Caption1>
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
        id={`${DATASET_NAME}[${index}].name`}
        i18nLabel={`${item.name}`}
        i18nPlaceholder={`${item?.namePlaceholder}`}
        maxLength={TEMPLATE_DATASET_FIELD_PROPS.name.maxLength}
        inline
        description={`${getI18nValue(
            `Template_Export_Kind_${item?.kind || 'None'}`
        )} ${item?.namePlaceholder}`}
    />
);

const getExportDescriptionField = (index: number) => (
    <CappedTextField
        id={`${DATASET_NAME}[${index}].description`}
        i18nLabel='Field Description'
        i18nPlaceholder='Template_Description_Optional_Placeholder'
        maxLength={TEMPLATE_DATASET_FIELD_PROPS.description.maxLength}
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
