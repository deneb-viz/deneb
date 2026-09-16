import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { type CappedTextFieldChange, type ModalDialogType } from '../ui';
import { DataTypeColumnCell } from './data-type-column-cell';
import { DataNameColumnCell } from './data-name-column-cell';
import { DataAssignmentColumnCell } from './data-assignment-column-cell';
import { DataDescriptionColumnCell } from './data-description-column-cell';
import { DataNameColumnField } from './data-name-column-field';
import { DataDescriptionColumnField } from './data-description-column-field';
import { type TemplateFieldAssignmentReducer } from './types';

type TemplateDatasetRowProps = {
    role: ModalDialogType;
    item: UsermetaDatasetField;
    index: number;
    setFieldAssignment: TemplateFieldAssignmentReducer;
    onMetadataPropertyChange: (change: CappedTextFieldChange) => void;
};

/**
 * For each field in the dataset (that is eligible for templating), handle the
 * display of rows that are required.
 */
export const TemplateDatasetRow = ({
    role,
    item,
    index,
    setFieldAssignment,
    onMetadataPropertyChange
}: TemplateDatasetRowProps) => {
    const description = item?.description || '';
    switch (role) {
        case 'new': {
            return (
                <>
                    <DataTypeColumnCell type={item.type} kind={item.kind} />
                    <DataNameColumnCell name={item.name} />
                    <DataAssignmentColumnCell
                        item={item}
                        role={role}
                        setFieldAssignment={setFieldAssignment}
                    />
                    <DataDescriptionColumnCell text={description} />
                </>
            );
        }
        case 'export': {
            return (
                <>
                    <DataTypeColumnCell type={item.type} kind={item.kind} />
                    <DataNameColumnCell name={item.namePlaceholder || ''} />
                    <DataNameColumnField
                        item={item}
                        index={index}
                        onValueChange={onMetadataPropertyChange}
                    />
                    <DataDescriptionColumnField
                        index={index}
                        onValueChange={onMetadataPropertyChange}
                    />
                </>
            );
        }
    }
    return <></>;
};
