import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import { type ModalDialogType } from '../ui';
import { DataTypeColumnCell } from './data-type-column-cell';
import { DataNameColumnCell } from './data-name-column-cell';
import { DataAssignmentColumnCell } from './data-assignment-column-cell';
import { DataDescriptionColumnCell } from './data-description-column-cell';
import { DataNameColumnField } from './data-name-column-field';
import { DataDescriptionColumnField } from './data-description-column-field';

type TemplateDatasetRowProps = {
    role: ModalDialogType;
    item: UsermetaDatasetField;
    index: number;
};

/**
 * For each field in the dataset (that is eligible for templating), handle the
 * display of rows that are required.
 */
export const TemplateDatasetRow = ({
    role,
    item,
    index
}: TemplateDatasetRowProps) => {
    const description = item?.description || '';
    switch (role) {
        case 'new': {
            return (
                <>
                    <DataTypeColumnCell type={item.type} />
                    <DataNameColumnCell name={item.name} />
                    <DataAssignmentColumnCell item={item} role={role} />
                    <DataDescriptionColumnCell text={description} />
                </>
            );
        }
        case 'mapping': {
            return (
                <>
                    <DataTypeColumnCell type={item.type} />
                    <DataNameColumnCell name={item.name} />
                    <DataAssignmentColumnCell item={item} role={role} />
                </>
            );
        }
        case 'export': {
            return (
                <>
                    <DataTypeColumnCell type={item.type} />
                    <DataNameColumnCell name={item.namePlaceholder || ''} />
                    <DataNameColumnField item={item} index={index} />
                    <DataDescriptionColumnField index={index} />
                </>
            );
        }
    }
    return <></>;
};
