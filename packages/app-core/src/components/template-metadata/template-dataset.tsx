import {
    TableBody,
    TableRow,
    Table,
    TableHeader,
    makeStyles
} from '@fluentui/react-components';

import {
    type UsermetaDatasetField,
    type UsermetaTemplate
} from '@deneb-viz/template-usermeta';
import { type ModalDialogType } from '../ui';
import { useDenebState } from '../../state';
import { TemplateDatasetColumns } from './template-dataset-columns';
import { logDebug } from '@deneb-viz/utils/logging';
import { TemplateDatasetRow } from './template-dataset-row';
import { useCallback } from 'react';

type TemplateDatasetProps = {
    datasetRole: ModalDialogType;
};

const useTemplateDatasetStyles = makeStyles({
    tableRow: {
        alignItems: 'start'
    }
});

/**
 * Displays a table of dataset columns and contextual controls, based on role.
 */
export const TemplateDataset = ({ datasetRole }: TemplateDatasetProps) => {
    const createMetadata = useDenebState(
        (state) => state.create.metadata as UsermetaTemplate
    );
    const exportMetadata = useDenebState(
        (state) => state.export.metadata as UsermetaTemplate
    );
    const fieldUsage = useDenebState((state) => state.fieldUsage);
    const classes = useTemplateDatasetStyles();
    /**
     * Provide content for eligible dataset fields.
     */
    const getTableFieldRows = useCallback(
        (role: ModalDialogType) => {
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
        },
        [datasetRole, createMetadata, exportMetadata, fieldUsage]
    );
    const tableBody = getTableFieldRows(datasetRole);

    const { dataset } = createMetadata || {};
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
            <TableBody>{tableBody}</TableBody>
        </Table>
    );
};
