import React from 'react';
import {
    TableBody,
    TableRow,
    Table,
    TableHeader
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import store, { getState } from '../../../store';
import { TemplateDatasetColumns } from './template-dataset-columns';
import { TemplateDatasetRow } from './template-dataset-row';
import { TModalDialogType } from '../../modal-dialog';
import { logDebug } from '../../logging';
import { useTemplateStyles } from '.';
import {
    UsermetaDatasetField,
    UsermetaTemplate
} from '@deneb-viz/core-dependencies';

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
        (state) => state.create.metadata as UsermetaTemplate,
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
    const {
        create: { metadata: createMetadata },
        export: { metadata: exportMetadata },
        fieldUsage
    } = getState();
    const classes = useTemplateStyles();
    let items: UsermetaDatasetField[] = [];
    switch (role) {
        case 'new':
            items = createMetadata?.dataset.slice() || [];
            break;
        case 'mapping':
            items = fieldUsage.remapFields.slice() || [];
            break;
        case 'export':
            items = exportMetadata?.dataset.slice() || [];
            break;
    }
    logDebug('getTableFieldRows', { items });
    return items.map((item, index) => (
        <TableRow
            key={`template-field-${item.key}-${index}`}
            className={classes.tableRow}
        >
            <TemplateDatasetRow item={item} role={role} index={index} />
        </TableRow>
    ));
};
