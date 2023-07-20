import React from 'react';
import {
    TableBody,
    TableRow,
    Table,
    TableHeader
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';
import reduce from 'lodash/reduce';

import store, { getState } from '../../../store';
import { TemplateDatasetColumns } from './template-dataset-columns';
import { TemplateDatasetRow } from './template-dataset-row';
import { TModalDialogType } from '../../modal-dialog';
import { IDenebTemplateMetadata, ITemplateDatasetField } from '../schema';

interface ITemplateDatasetProps {
    datasetRole: TModalDialogType;
}

/**
 * Displays a table of dataset columns and contextual controls, based on role.
 */
export const TemplateDataset: React.FC<ITemplateDatasetProps> = ({
    datasetRole
}) => {
    const metadata = store(
        (state) => state.templateToApply.usermeta as IDenebTemplateMetadata,
        shallow
    );
    const { dataset } = metadata || {};
    if (dataset?.length === 0 || 0) {
        return <></>;
    }
    return (
        <Table noNativeElements>
            <TableHeader>
                <TableRow>
                    <TemplateDatasetColumns role={datasetRole} />
                </TableRow>
            </TableHeader>
            <TableBody>{getTableFieldRows(datasetRole)}</TableBody>
        </Table>
    );
};

/**
 * Provide content for eligible dataset fields.
 */
const getTableFieldRows = (role: TModalDialogType) => {
    const { editorFieldsInUse, templateToApply } = getState();
    const mappedFieldsInUse = reduce(
        editorFieldsInUse,
        (acc, field) => {
            if (field?.templateMetadata) {
                acc.push(field?.templateMetadata);
            }
            return acc;
        },
        ([] as ITemplateDatasetField[]) || []
    );
    let items: ITemplateDatasetField[] = [];
    switch (role) {
        case 'new':
            items =
                (templateToApply.usermeta as IDenebTemplateMetadata)?.dataset ||
                [];
            break;
        case 'mapping':
        case 'export':
            items = mappedFieldsInUse;
    }
    return items.map((item) => (
        <TableRow>
            <TemplateDatasetRow item={item} role={role} />
        </TableRow>
    ));
};
