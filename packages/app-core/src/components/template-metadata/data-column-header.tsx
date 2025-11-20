import { TableHeaderCell } from '@fluentui/react-components';

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useDataTypeColumnCellStyles } from './data-type-column-cell';
import { useDataNameColumnCellStyles } from './data-name-column-cell';
import { useDataAssignmentColumnCellStyles } from './data-assignment-column-cell';

/**
 * Denotes the role that a column performs, allowing us to switch based on this value.
 */
type DenebTemplateDatasetColumnRole =
    | 'type'
    | 'name'
    | 'assignment'
    | 'description'
    | 'originalName'
    | 'exportName'
    | 'exportDescription';

type DataColumnHeaderProps = {
    columnRole: DenebTemplateDatasetColumnRole;
};

/**
 * Displays the table header for a name column.
 */
export const DataColumnHeader = ({ columnRole }: DataColumnHeaderProps) => {
    return (
        <TableHeaderCell
            className={getDataColumnClass(columnRole)}
            key={columnRole}
        >
            {getDataColumnText(columnRole)}
        </TableHeaderCell>
    );
};

/**
 * Resolve class name based on role.
 */
const getDataColumnClass = (role: DenebTemplateDatasetColumnRole) => {
    switch (role) {
        case 'type':
            return useDataTypeColumnCellStyles().root;
        case 'name':
        case 'originalName':
        case 'exportName':
            return useDataNameColumnCellStyles().root;
        case 'assignment':
            return useDataAssignmentColumnCellStyles().root;
        default:
            return '';
    }
};

/**
 * Resolve heading column text based on role.
 */
const getDataColumnText = (role: DenebTemplateDatasetColumnRole) => {
    switch (role) {
        case 'name':
            return getI18nValue('Text_Template_Dataset_Field_Name');
        case 'exportName':
            return getI18nValue('Text_Template_Dataset_Field_Name_Export');
        case 'originalName':
            return getI18nValue('Text_Template_Dataset_Field_OriginalName');
        case 'assignment':
            return getI18nValue('Text_Template_Dataset_Field_Assignment');
        case 'description':
        case 'exportDescription':
            return getI18nValue('Text_Template_Dataset_Field_Description');
        default:
            return '';
    }
};
