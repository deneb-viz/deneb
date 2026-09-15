import {
    TableBody,
    TableRow,
    Table,
    TableHeader,
    makeStyles
} from '@fluentui/react-components';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type CappedTextFieldChange, type ModalDialogType } from '../ui';
import { TemplateDatasetColumns } from './template-dataset-columns';
import { logDebug } from '@deneb-viz/utils/logging';
import { TemplateDatasetRow } from './template-dataset-row';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { type TemplateFieldAssignmentReducer } from './types';

type TemplateDatasetProps = {
    datasetRole: ModalDialogType;
    /**
     * The template metadata this table reads its dataset fields from,
     * injected by the caller rather than resolved internally from
     * `datasetRole` — the create path (`template-information.tsx`) passes
     * `state.create.metadata`; the export path (`export-pane.tsx`) passes
     * `state.export.metadata`. Keeps `template-metadata` free of any
     * reference to either the create or export slice.
     */
    metadata: UsermetaTemplate | undefined;
    /**
     * Field-assignment reducer for this table, injected by the caller
     * rather than resolved internally from `datasetRole` — the create path
     * (`template-information.tsx`) passes `state.create.setFieldAssignment`;
     * the export path (`export-pane.tsx`) passes
     * `state.fieldUsage.setFieldAssignment`. Keeps `template-metadata`
     * free of any reference to the editor-side `fieldUsage` slice. See
     * `types.ts`.
     */
    setFieldAssignment: TemplateFieldAssignmentReducer;
    /**
     * Receives edits to the editable name/description fields, keyed by
     * metadata property selector. Only the `export` role renders those
     * fields, so only the export path needs to supply this.
     */
    onMetadataPropertyChange?: (change: CappedTextFieldChange) => void;
};

const useTemplateDatasetStyles = makeStyles({
    tableRow: {
        alignItems: 'start'
    }
});

// The `new` role renders no editable metadata fields, so it never reports one.
const ignoreMetadataPropertyChange = () => undefined;

/**
 * Displays a table of dataset columns and contextual controls, based on role.
 */
export const TemplateDataset = ({
    datasetRole,
    metadata,
    setFieldAssignment,
    onMetadataPropertyChange = ignoreMetadataPropertyChange
}: TemplateDatasetProps) => {
    const classes = useTemplateDatasetStyles();
    /**
     * Provide content for eligible dataset fields.
     */
    const items: UsermetaDatasetField[] =
        metadata?.datasets?.[DATASET_DEFAULT_NAME]?.slice() || [];
    logDebug('getTableFieldRows', { items });
    const tableBody = items.map((item, index) => (
        <TableRow
            key={`template-field-${item.key}-${index}`}
            className={classes.tableRow}
        >
            <TemplateDatasetRow
                item={item}
                role={datasetRole}
                index={index}
                setFieldAssignment={setFieldAssignment}
                onMetadataPropertyChange={onMetadataPropertyChange}
            />
        </TableRow>
    ));

    if (tableBody.length === 0) {
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
